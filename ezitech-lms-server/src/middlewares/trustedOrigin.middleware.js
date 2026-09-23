const env = require('../config/env');
const ApiError = require('../utils/ApiError');

const allowed = env.clientOrigin.replace(/\/$/, '');

function requireTrustedOrigin(req, res, next) {
  const origin = req.get('origin');
  if (origin && origin.replace(/\/$/, '') !== allowed) {
    return next(ApiError.forbidden('Cross-origin request rejected'));
  }
  return next();
}

module.exports = requireTrustedOrigin;
