const crypto = require('crypto');
const speakeasy = require('speakeasy');
const { User } = require('../../models/User.model');
const { hashToken } = require('../../utils/tokenUtils');
const { encrypt, decrypt, isEncrypted } = require('../../utils/secretBox');

const TOTP_STEP_SECONDS = 30;

function generateRecoveryCodes() {
  const raw = Array.from({ length: 10 }, () => crypto.randomBytes(10).toString('hex'));
  return { raw, hashes: raw.map(hashToken) };
}

function isValidTotp(storedSecret, token) {
  return speakeasy.totp.verify({
    secret: decrypt(storedSecret),
    encoding: 'base32',
    token,
    window: 1,
  });
}

async function verifyTotpOnce(userId, storedSecret, token) {
  const result = speakeasy.totp.verifyDelta({
    secret: decrypt(storedSecret),
    encoding: 'base32',
    token,
    window: 1,
  });
  if (!result) return false;

  const step = Math.floor(Date.now() / 1000 / TOTP_STEP_SECONDS) + result.delta;
  const claimed = await User.updateOne(
    { _id: userId, $or: [{ mfaLastUsedStep: { $exists: false } }, { mfaLastUsedStep: { $lt: step } }] },
    { $set: { mfaLastUsedStep: step } }
  );
  if (claimed.modifiedCount !== 1) return false;

  if (!isEncrypted(storedSecret)) {
    await User.updateOne({ _id: userId }, { $set: { mfaSecret: encrypt(decrypt(storedSecret)) } });
  }
  return true;
}

async function consumeRecoveryCode(userId, rawCode) {
  const hash = hashToken(String(rawCode).trim().toLowerCase());
  const consumed = await User.updateOne(
    { _id: userId, mfaRecoveryCodeHashes: hash },
    { $pull: { mfaRecoveryCodeHashes: hash } }
  );
  return consumed.modifiedCount === 1;
}

async function verifySecondFactor(user, { token, recoveryCode }) {
  if (recoveryCode) return consumeRecoveryCode(user._id, recoveryCode);
  if (token) return verifyTotpOnce(user._id, user.mfaSecret, token);
  return false;
}

module.exports = { generateRecoveryCodes, isValidTotp, verifySecondFactor, encrypt };
