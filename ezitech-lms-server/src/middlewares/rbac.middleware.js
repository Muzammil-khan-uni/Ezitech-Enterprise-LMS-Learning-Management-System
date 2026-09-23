const ApiError = require('../utils/ApiError');

function authorize(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return next(ApiError.unauthorized('Authentication required'));
    }
    if (!allowedRoles.includes(req.user.role)) {
      return next(ApiError.forbidden('You do not have permission to perform this action'));
    }
    next();
  };
}

function can(permission) {
  return (req, res, next) => {
    if (!req.user) {
      return next(ApiError.unauthorized('Authentication required'));
    }
    if (req.user.role === 'admin' || req.user.permissions.includes(permission)) {
      return next();
    }
    return next(ApiError.forbidden(`Missing required permission: ${permission}`));
  };
}

module.exports = { authorize, can };
