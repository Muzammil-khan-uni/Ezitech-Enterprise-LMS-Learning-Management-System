const fs = require('fs/promises');
const { User, ROLES } = require('../../models/User.model');
const InstructorProfile = require('../../models/InstructorProfile.model');
const StudentProfile = require('../../models/StudentProfile.model');
const MentorProfile = require('../../models/MentorProfile.model');
const ApiError = require('../../utils/ApiError');
const env = require('../../config/env');
const { generateRawToken, hashToken } = require('../../utils/tokenUtils');
const { enqueueEmail } = require('../../jobs/email.job');
const logger = require('../../utils/logger');
const accountLock = require('../auth/accountLock');
const { uploadToCloudinary, deleteAsset } = require('../uploads/uploads.service');

const INVITE_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const EMAIL_VERIFICATION_TTL_MS = 3 * 24 * 60 * 60 * 1000;

const PROFILE_MODEL_BY_ROLE = {
  instructor: InstructorProfile,
  student: StudentProfile,
  mentor: MentorProfile,
};

async function createRoleProfile(user) {
  const Model = PROFILE_MODEL_BY_ROLE[user.role];
  if (!Model) return null;

  const profile = await Model.create({ user: user._id });
  user.roleProfileId = profile._id;
  await user.save();
  return profile;
}

async function getFullProfile(userId) {
  const user = await User.findById(userId);
  if (!user) throw ApiError.notFound('User not found');

  const Model = PROFILE_MODEL_BY_ROLE[user.role];
  const roleProfile = Model && user.roleProfileId ? await Model.findById(user.roleProfileId) : null;

  if (user.bio === undefined && roleProfile && roleProfile.bio) {
    user.bio = roleProfile.bio;
    await user.save();
  }

  return { user: user.toSafeObject(), roleProfile };
}

function normalizeSkills(skills) {
  const seen = new Set();
  const result = [];
  for (const raw of skills) {
    const skill = raw.trim().replace(/\s+/g, ' ');
    const key = skill.toLowerCase();
    if (skill && !seen.has(key)) {
      seen.add(key);
      result.push(skill);
    }
  }
  return result;
}

function normalizeEducation(entries) {
  return entries.map((entry) => ({
    ...(entry._id ? { _id: entry._id } : {}),
    school: entry.school,
    degree: entry.degree || undefined,
    field: entry.field || undefined,
    startYear: entry.startYear || undefined,
    endYear: entry.endYear || undefined,
    description: entry.description || undefined,
  }));
}

async function updateBaseProfile(userId, updates) {
  const user = await User.findById(userId);
  if (!user) throw ApiError.notFound('User not found');

  if (updates.name !== undefined) user.name = updates.name;
  if (updates.phone !== undefined) user.phone = updates.phone || undefined;
  if (updates.bio !== undefined) user.bio = updates.bio || '';
  if (updates.skills !== undefined) user.skills = normalizeSkills(updates.skills);
  if (updates.education !== undefined) user.education = normalizeEducation(updates.education);
  if (updates.socialLinks) {
    for (const key of ['github', 'linkedin']) {
      if (updates.socialLinks[key] !== undefined) {
        user.set(`socialLinks.${key}`, updates.socialLinks[key] || undefined);
      }
    }
  }

  await user.save();
  return user.toSafeObject();
}

async function setAvatar(userId, localFilePath) {
  const user = await User.findById(userId);
  if (!user) {
    await fs.unlink(localFilePath).catch(() => {});
    throw ApiError.notFound('User not found');
  }

  const result = await uploadToCloudinary('avatar', localFilePath, 'avatars', {
    transformation: [{ width: 512, height: 512, crop: 'fill', gravity: 'face' }],
  });

  const previousPublicId = user.avatar && user.avatar.publicId;
  user.avatar = { url: result.url, publicId: result.publicId };
  await user.save();

  if (previousPublicId) {
    await deleteAsset(previousPublicId, 'avatar').catch((err) =>
      logger.warn(`Failed to delete previous avatar ${previousPublicId}: ${err.message}`)
    );
  }
  return user.toSafeObject();
}

async function removeAvatar(userId) {
  const user = await User.findById(userId);
  if (!user) throw ApiError.notFound('User not found');

  const previousPublicId = user.avatar && user.avatar.publicId;
  user.avatar = undefined;
  await user.save();

  if (previousPublicId) {
    await deleteAsset(previousPublicId, 'avatar').catch((err) =>
      logger.warn(`Failed to delete avatar ${previousPublicId}: ${err.message}`)
    );
  }
  return user.toSafeObject();
}

async function changeEmail(userId, { email, password }) {
  const user = await User.findById(userId).select('+password');
  if (!user) throw ApiError.notFound('User not found');

  accountLock.assertNotLocked(user);
  if (!(await user.comparePassword(password))) {
    await accountLock.failAttempt(user, ApiError.badRequest('Incorrect password'));
  }
  if (email === user.email) {
    throw ApiError.badRequest('That is already your email address');
  }
  if (await User.exists({ email, _id: { $ne: user._id } })) {
    throw ApiError.conflict('An account with this email already exists');
  }

  const previousEmail = user.email;
  const rawToken = generateRawToken();
  user.email = email;
  user.isEmailVerified = false;
  user.emailVerificationTokenHash = hashToken(rawToken);
  user.emailVerificationExpires = new Date(Date.now() + EMAIL_VERIFICATION_TTL_MS);
  await user.save();

  const verifyUrl = `${env.clientOrigin}/verify-email?token=${rawToken}`;
  await enqueueEmail('verifyEmail', user.email, { name: user.name, verifyUrl });
  await enqueueEmail('emailChangedNotice', previousEmail, { name: user.name, newEmail: user.email });

  return user.toSafeObject();
}

async function updateRoleProfile(userId, updates) {
  const user = await User.findById(userId);
  if (!user) throw ApiError.notFound('User not found');

  const Model = PROFILE_MODEL_BY_ROLE[user.role];
  if (!Model) {
    throw ApiError.badRequest(`The ${user.role} role has no extended profile`);
  }

  const profile = await Model.findOneAndUpdate({ user: userId }, updates, {
    new: true,
    runValidators: true,
  });
  if (!profile) throw ApiError.notFound('Profile not found');
  return profile;
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function listUsers({ role, status, search, page = 1, limit = 20 }) {
  const filter = {};
  if (role) filter.role = role;
  if (status === 'active') filter.isActive = true;
  if (status === 'inactive') filter.isActive = false;
  if (search) {
    const term = search.trim();
    if (term) {
      filter.$or = [
        { name: { $regex: escapeRegex(term), $options: 'i' } },
        { email: { $regex: escapeRegex(term), $options: 'i' } },
      ];
    }
  }

  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    User.find(filter).skip(skip).limit(limit).sort('-createdAt'),
    User.countDocuments(filter),
  ]);

  return {
    items: items.map((u) => {
      const obj = u.toSafeObject();
      if (u.lockUntil && u.lockUntil.getTime() > Date.now()) obj.lockedUntil = u.lockUntil;
      return obj;
    }),
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  };
}

async function inviteUser({ name, email, role }) {
  const existing = await User.findOne({ email });
  if (existing) {
    throw ApiError.conflict('An account with this email already exists');
  }

  const rawToken = generateRawToken();

  const user = await User.create({
    name,
    email,
    role,
    isActive: false,
    invitePending: true,
    password: generateRawToken(),
    passwordResetTokenHash: hashToken(rawToken),
    passwordResetExpires: new Date(Date.now() + INVITE_TOKEN_TTL_MS),
  });
  await createRoleProfile(user);

  const setPasswordUrl = `${env.clientOrigin}/set-password?token=${rawToken}`;
  await enqueueEmail('inviteUser', user.email, { name: user.name, role: user.role, setPasswordUrl });

  return user.toSafeObject();
}

async function setUserActive(userId, isActive) {
  if (!isActive) {
    const target = await User.findById(userId);
    if (!target) throw ApiError.notFound('User not found');

    if (target.role === 'admin') {
      const activeAdminCount = await User.countDocuments({ role: 'admin', isActive: true });
      if (activeAdminCount <= 1) {
        throw ApiError.badRequest('Cannot deactivate the last remaining active admin account');
      }
    }
  }

  const update = isActive
    ? { isActive }
    : {
        $set: { isActive, invitePending: false },
        $unset: { passwordResetTokenHash: 1, passwordResetExpires: 1 },
      };
  const result = await User.updateOne({ _id: userId }, update);
  if (result.matchedCount === 0) throw ApiError.notFound('User not found');
  const user = await User.findById(userId);
  return user.toSafeObject();
}

async function listMentors() {
  const mentors = await User.find({ role: 'mentor', isActive: true }).select('name email').sort('name').lean();
  return mentors;
}

async function unlockUser(userId) {
  const result = await User.updateOne(
    { _id: userId },
    { $set: { failedLoginAttempts: 0 }, $unset: { lockUntil: 1, lastFailedLoginAt: 1 } }
  );
  if (result.matchedCount === 0) throw ApiError.notFound('User not found');
  const user = await User.findById(userId);
  return user.toSafeObject();
}

module.exports = {
  createRoleProfile,
  getFullProfile,
  updateBaseProfile,
  setAvatar,
  removeAvatar,
  changeEmail,
  updateRoleProfile,
  listUsers,
  inviteUser,
  setUserActive,
  unlockUser,
  listMentors,
  ROLES,
};
