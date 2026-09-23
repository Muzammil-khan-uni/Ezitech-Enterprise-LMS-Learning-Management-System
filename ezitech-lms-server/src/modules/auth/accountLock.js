const { User } = require('../../models/User.model');
const ApiError = require('../../utils/ApiError');
const env = require('../../config/env');
const { enqueueEmail } = require('../../jobs/email.job');

function lockedError(lockUntil) {
  const seconds = Math.max(1, Math.ceil((lockUntil.getTime() - Date.now()) / 1000));
  const minutes = Math.max(1, Math.ceil(seconds / 60));
  return ApiError.tooManyRequests(
    `Too many failed attempts. Try again in ${minutes} minute${minutes === 1 ? '' : 's'}.`,
    { locked: true, retryAfterSeconds: seconds }
  );
}

function isLocked(user) {
  return Boolean(user.lockUntil && user.lockUntil.getTime() > Date.now());
}

function assertNotLocked(user) {
  if (isLocked(user)) throw lockedError(user.lockUntil);
}

async function registerFailure(user) {
  const now = new Date();
  const cutoff = new Date(now.getTime() - env.security.failureWindowMs);

  const counted = await User.updateOne(
    { _id: user._id, lastFailedLoginAt: { $gte: cutoff } },
    { $inc: { failedLoginAttempts: 1 }, $set: { lastFailedLoginAt: now } }
  );
  if (counted.matchedCount === 0) {
    await User.updateOne({ _id: user._id }, { $set: { failedLoginAttempts: 1, lastFailedLoginAt: now } });
  }

  const fresh = await User.findById(user._id).select('failedLoginAttempts');
  if (!fresh || fresh.failedLoginAttempts < env.security.maxLoginAttempts) return null;

  const lockUntil = new Date(now.getTime() + env.security.lockMs);
  const locked = await User.updateOne(
    { _id: user._id, failedLoginAttempts: { $gte: env.security.maxLoginAttempts } },
    { $set: { lockUntil, failedLoginAttempts: 0 } }
  );
  if (locked.modifiedCount === 1) {
    await enqueueEmail('accountLocked', user.email, {
      name: user.name,
      minutes: Math.round(env.security.lockMs / 60000),
    }).catch(() => undefined);
  }
  return lockUntil;
}

async function resetFailures(user) {
  if (!user.failedLoginAttempts && !user.lockUntil) return;
  await User.updateOne(
    { _id: user._id },
    { $set: { failedLoginAttempts: 0 }, $unset: { lockUntil: 1, lastFailedLoginAt: 1 } }
  );
}

async function failAttempt(user, error) {
  const lockUntil = await registerFailure(user);
  throw lockUntil ? lockedError(lockUntil) : error;
}

module.exports = { assertNotLocked, isLocked, registerFailure, resetFailures, failAttempt, lockedError };
