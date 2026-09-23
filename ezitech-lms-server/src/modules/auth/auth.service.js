const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const bcrypt = require('bcryptjs');

const { User } = require('../../models/User.model');
const Session = require('../../models/Session.model');
const ApiError = require('../../utils/ApiError');
const env = require('../../config/env');
const usersService = require('../users/users.service');
const accountLock = require('./accountLock');
const mfa = require('./mfa');
const { enqueueEmail } = require('../../jobs/email.job');
const {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  hashToken,
  generateRawToken,
  deriveDeviceLabel,
} = require('../../utils/tokenUtils');

const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000;
const EMAIL_VERIFICATION_TTL_MS = 3 * 24 * 60 * 60 * 1000;
const REFRESH_GRACE_MS = 10 * 1000;

let dummyHash;
function getDummyHash() {
  if (!dummyHash) dummyHash = bcrypt.hashSync('not-a-real-password', 12);
  return dummyHash;
}

function invalidCredentials() {
  return ApiError.unauthorized('Invalid email or password');
}

function isInvitePending(user) {
  if (user.invitePending === true) return true;
  return user.invitePending === undefined && !user.isActive && !user.lastLoginAt;
}

async function createSession(user, req) {
  const expiresAt = new Date(Date.now() + env.jwt.refreshTtlMs);

  const session = await Session.create({
    user: user._id,
    refreshTokenHash: 'pending',
    deviceInfo: {
      userAgent: req.headers['user-agent'] || '',
      ip: req.ip,
      label: deriveDeviceLabel(req.headers['user-agent']),
    },
    expiresAt,
  });

  const refreshToken = signRefreshToken(user, session._id);
  session.refreshTokenHash = hashToken(refreshToken);
  await session.save();

  return { session, refreshToken };
}

async function revokeAllSessions(userId) {
  await Session.updateMany({ user: userId, isRevoked: false }, { $set: { isRevoked: true } });
}

async function register({ name, email, password }) {
  const existing = await User.findOne({ email });
  if (existing) {
    throw ApiError.conflict('An account with this email already exists');
  }

  const user = await User.create({ name, email, password, role: 'student' });
  await usersService.createRoleProfile(user);
  await enqueueEmail('welcome', user.email, { name: user.name });
  await sendVerificationEmail(user);
  return user;
}

async function sendVerificationEmail(user) {
  const rawToken = generateRawToken();
  user.emailVerificationTokenHash = hashToken(rawToken);
  user.emailVerificationExpires = new Date(Date.now() + EMAIL_VERIFICATION_TTL_MS);
  await user.save();

  const verifyUrl = `${env.clientOrigin}/verify-email?token=${rawToken}`;
  await enqueueEmail('verifyEmail', user.email, { name: user.name, verifyUrl });
}

async function resendVerificationEmail(userId) {
  const user = await User.findById(userId);
  if (!user) throw ApiError.notFound('User not found');
  if (user.isEmailVerified) {
    throw ApiError.badRequest('This email address is already verified');
  }
  await sendVerificationEmail(user);
}

async function verifyEmail(rawToken) {
  const user = await User.findOne({
    emailVerificationTokenHash: hashToken(rawToken),
    emailVerificationExpires: { $gt: new Date() },
  }).select('+emailVerificationTokenHash +emailVerificationExpires');

  if (!user) {
    throw ApiError.badRequest('This verification link is invalid or has expired');
  }

  user.isEmailVerified = true;
  user.emailVerificationTokenHash = undefined;
  user.emailVerificationExpires = undefined;
  await user.save();
}

async function login({ email, password, mfaToken, recoveryCode }, req) {
  const user = await User.findOne({ email }).select('+password +mfaSecret +mfaRecoveryCodeHashes');

  if (!user) {
    await bcrypt.compare(password, getDummyHash());
    throw invalidCredentials();
  }

  accountLock.assertNotLocked(user);

  if (!(await user.comparePassword(password))) {
    return accountLock.failAttempt(user, invalidCredentials());
  }

  if (!user.isActive) {
    throw ApiError.forbidden('This account has been deactivated');
  }

  if (user.mfaEnabled) {
    if (!mfaToken && !recoveryCode) {
      const err = ApiError.unauthorized('MFA token required');
      err.mfaRequired = true;
      throw err;
    }

    const verified = await mfa.verifySecondFactor(user, { token: mfaToken, recoveryCode });
    if (!verified) {
      return accountLock.failAttempt(
        user,
        ApiError.unauthorized(recoveryCode ? 'Invalid or already-used recovery code' : 'Invalid MFA token')
      );
    }
  }

  await accountLock.resetFailures(user);
  user.lastLoginAt = new Date();
  await user.save();

  const accessToken = signAccessToken(user);
  const { refreshToken } = await createSession(user, req);

  return { user: user.toSafeObject(), accessToken, refreshToken };
}

async function refresh(refreshToken) {
  if (!refreshToken) {
    throw ApiError.unauthorized('Refresh token missing');
  }

  const payload = verifyRefreshToken(refreshToken);
  const session = await Session.findById(payload.sid);

  if (!session || session.isRevoked || session.user.toString() !== payload.sub) {
    throw ApiError.unauthorized('Session is no longer valid');
  }

  const presentedHash = hashToken(refreshToken);

  if (session.refreshTokenHash !== presentedHash) {
    const justRotated =
      session.previousRefreshTokenHash === presentedHash &&
      session.previousRotatedAt &&
      Date.now() - session.previousRotatedAt.getTime() < REFRESH_GRACE_MS;

    if (justRotated) {
      throw ApiError.conflict('This session was just refreshed elsewhere - retry');
    }

    session.isRevoked = true;
    await session.save();
    throw ApiError.unauthorized('Session invalidated - please log in again');
  }

  const user = await User.findById(payload.sub);
  if (!user || !user.isActive) {
    throw ApiError.unauthorized('Account no longer active');
  }

  const newAccessToken = signAccessToken(user);
  const newRefreshToken = signRefreshToken(user, session._id);
  const now = new Date();

  const rotated = await Session.updateOne(
    { _id: session._id, refreshTokenHash: presentedHash, isRevoked: false },
    {
      $set: {
        previousRefreshTokenHash: presentedHash,
        previousRotatedAt: now,
        refreshTokenHash: hashToken(newRefreshToken),
        lastActiveAt: now,
        expiresAt: new Date(now.getTime() + env.jwt.refreshTtlMs),
      },
    }
  );
  if (rotated.modifiedCount !== 1) {
    throw ApiError.conflict('This session was just refreshed elsewhere - retry');
  }

  return { accessToken: newAccessToken, refreshToken: newRefreshToken };
}

async function logout(refreshToken) {
  if (!refreshToken) return;
  try {
    const payload = verifyRefreshToken(refreshToken);
    await Session.findByIdAndUpdate(payload.sid, { isRevoked: true });
  } catch {
    return;
  }
}

async function listDevices(userId) {
  const sessions = await Session.find({ user: userId, isRevoked: false })
    .select('deviceInfo lastActiveAt createdAt expiresAt')
    .sort('-lastActiveAt');
  return sessions;
}

async function revokeDevice(userId, sessionId) {
  const session = await Session.findOne({ _id: sessionId, user: userId });
  if (!session) {
    throw ApiError.notFound('Session not found');
  }
  session.isRevoked = true;
  await session.save();
}

async function requestPasswordReset(email) {
  const user = await User.findOne({ email });
  if (!user || !user.isActive) return;

  const rawToken = generateRawToken();
  user.passwordResetTokenHash = hashToken(rawToken);
  user.passwordResetExpires = new Date(Date.now() + PASSWORD_RESET_TTL_MS);
  await user.save();

  const resetUrl = `${env.clientOrigin}/reset-password?token=${rawToken}`;
  await enqueueEmail('passwordReset', user.email, { name: user.name, resetUrl });
}

async function findUserByResetToken(rawToken) {
  return User.findOne({
    passwordResetTokenHash: hashToken(rawToken),
    passwordResetExpires: { $gt: new Date() },
  }).select('+passwordResetTokenHash +passwordResetExpires');
}

async function resetPassword(rawToken, newPassword) {
  const user = await findUserByResetToken(rawToken);

  if (!user || !user.isActive || isInvitePending(user)) {
    throw ApiError.badRequest('This reset link is invalid or has expired');
  }

  user.password = newPassword;
  user.isEmailVerified = true;
  user.passwordResetTokenHash = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  await accountLock.resetFailures(user);
  await revokeAllSessions(user._id);
  await enqueueEmail('passwordChanged', user.email, { name: user.name });
}

async function setPasswordWithToken(rawToken, newPassword) {
  const user = await findUserByResetToken(rawToken);

  if (!user || !isInvitePending(user)) {
    throw ApiError.badRequest('This invite link is invalid or has expired');
  }

  user.password = newPassword;
  user.isActive = true;
  user.isEmailVerified = true;
  user.invitePending = false;
  user.passwordResetTokenHash = undefined;
  user.passwordResetExpires = undefined;
  await user.save();
}

async function changePassword(userId, { currentPassword, newPassword }, req) {
  const user = await User.findById(userId).select('+password');
  if (!user) throw ApiError.notFound('User not found');

  accountLock.assertNotLocked(user);

  if (!(await user.comparePassword(currentPassword))) {
    return accountLock.failAttempt(user, ApiError.badRequest('Your current password is incorrect'));
  }
  if (currentPassword === newPassword) {
    throw ApiError.badRequest('Choose a new password that is different from the current one');
  }

  user.password = newPassword;
  await user.save();

  await accountLock.resetFailures(user);
  await revokeAllSessions(user._id);
  await enqueueEmail('passwordChanged', user.email, { name: user.name });

  const accessToken = signAccessToken(user);
  const { refreshToken } = await createSession(user, req);
  return { accessToken, refreshToken };
}

async function assertReauthenticated(userId, { password, token, recoveryCode }, { allowRecoveryCode }) {
  const user = await User.findById(userId).select('+password +mfaSecret +mfaRecoveryCodeHashes');
  if (!user) throw ApiError.notFound('User not found');
  if (!user.mfaEnabled) throw ApiError.badRequest('MFA is not enabled on this account');

  accountLock.assertNotLocked(user);

  if (!(await user.comparePassword(password))) {
    return accountLock.failAttempt(user, ApiError.badRequest('Incorrect password'));
  }

  const verified = await mfa.verifySecondFactor(user, {
    token,
    recoveryCode: allowRecoveryCode ? recoveryCode : undefined,
  });
  if (!verified) {
    return accountLock.failAttempt(user, ApiError.badRequest('Invalid verification code'));
  }

  return user;
}

async function setupMfa(userId) {
  const user = await User.findById(userId).select('mfaEnabled');
  if (!user) throw ApiError.notFound('User not found');
  if (user.mfaEnabled) {
    throw ApiError.conflict('MFA is already enabled. Turn it off first if you want to set it up again.');
  }

  const secret = speakeasy.generateSecret({
    name: `Ezitech LMS`,
    length: 20,
  });

  await User.updateOne(
    { _id: userId },
    { $set: { mfaSecret: mfa.encrypt(secret.base32), mfaEnabled: false }, $unset: { mfaLastUsedStep: 1 } }
  );

  const qrCodeDataUrl = await QRCode.toDataURL(secret.otpauth_url);

  return { secret: secret.base32, qrCodeDataUrl };
}

async function verifyAndEnableMfa(userId, token) {
  const user = await User.findById(userId).select('+mfaSecret');
  if (!user || !user.mfaSecret) {
    throw ApiError.badRequest('MFA setup has not been started');
  }
  if (user.mfaEnabled) {
    throw ApiError.conflict('MFA is already enabled');
  }

  if (!mfa.isValidTotp(user.mfaSecret, token)) {
    throw ApiError.badRequest('Invalid MFA code');
  }

  const { raw, hashes } = mfa.generateRecoveryCodes();

  user.mfaEnabled = true;
  user.mfaRecoveryCodeHashes = hashes;
  await user.save();

  return { recoveryCodes: raw };
}

async function disableMfa(userId, credentials) {
  await assertReauthenticated(userId, credentials, { allowRecoveryCode: true });

  await User.updateOne(
    { _id: userId },
    { $set: { mfaEnabled: false }, $unset: { mfaSecret: 1, mfaRecoveryCodeHashes: 1, mfaLastUsedStep: 1 } }
  );
}

async function getRecoveryCodeCount(userId) {
  const user = await User.findById(userId).select('+mfaRecoveryCodeHashes mfaEnabled');
  if (!user || !user.mfaEnabled) return null;
  return (user.mfaRecoveryCodeHashes || []).length;
}

async function regenerateRecoveryCodes(userId, credentials) {
  await assertReauthenticated(userId, credentials, { allowRecoveryCode: false });

  const { raw, hashes } = mfa.generateRecoveryCodes();
  await User.updateOne({ _id: userId }, { $set: { mfaRecoveryCodeHashes: hashes } });

  return { recoveryCodes: raw };
}

module.exports = {
  register,
  login,
  refresh,
  logout,
  listDevices,
  revokeDevice,
  setupMfa,
  verifyAndEnableMfa,
  disableMfa,
  getRecoveryCodeCount,
  regenerateRecoveryCodes,
  setPasswordWithToken,
  requestPasswordReset,
  resetPassword,
  changePassword,
  revokeAllSessions,
  sendVerificationEmail,
  resendVerificationEmail,
  verifyEmail,
};
