const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const env = require('../config/env');

function signAccessToken(user) {
  return jwt.sign(
    {
      sub: user._id.toString(),
      role: user.role,
      permissions: user.permissions || [],
    },
    env.jwt.accessSecret,
    { expiresIn: env.jwt.accessExpiresIn }
  );
}

function signRefreshToken(user, sessionId) {
  return jwt.sign(
    { sub: user._id.toString(), sid: sessionId.toString(), jti: crypto.randomUUID() },
    env.jwt.refreshSecret,
    { expiresIn: env.jwt.refreshExpiresIn }
  );
}

function verifyAccessToken(token) {
  return jwt.verify(token, env.jwt.accessSecret);
}

function verifyRefreshToken(token) {
  return jwt.verify(token, env.jwt.refreshSecret);
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function generateRawToken() {
  return crypto.randomBytes(32).toString('hex');
}

function deriveDeviceLabel(userAgent = '') {
  if (/mobile/i.test(userAgent)) return 'Mobile device';
  if (/chrome/i.test(userAgent)) return 'Chrome browser';
  if (/firefox/i.test(userAgent)) return 'Firefox browser';
  if (/safari/i.test(userAgent)) return 'Safari browser';
  return 'Unknown device';
}

module.exports = {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  hashToken,
  generateRawToken,
  deriveDeviceLabel,
};
