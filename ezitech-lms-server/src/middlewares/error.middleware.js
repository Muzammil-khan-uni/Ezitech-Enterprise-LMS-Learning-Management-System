const env = require('../config/env');
const logger = require('../utils/logger');
const ApiError = require('../utils/ApiError');

// eslint-disable-next-line no-unused-vars
function errorMiddleware(err, req, res, next) {
  let error = err;

  if (error.name === 'CastError') {
    error = ApiError.badRequest(`Invalid ${error.path}: ${error.value}`);
  } else if (error.name === 'ValidationError') {
    const messages = Object.values(error.errors).map((e) => e.message);
    error = ApiError.badRequest('Validation failed', messages);
  } else if (error.code === 11000) {
    const field = Object.keys(error.keyValue || {})[0];
    error = ApiError.conflict(`Duplicate value for field: ${field}`);
  } else if (error.type === 'entity.parse.failed') {
    error = ApiError.badRequest('Malformed JSON in request body');
  } else if (error.type === 'entity.too.large') {
    error = ApiError.payloadTooLarge('Request body is too large');
  } else if (error.name === 'JsonWebTokenError') {
    error = ApiError.unauthorized('Invalid token');
  } else if (error.name === 'TokenExpiredError') {
    error = ApiError.unauthorized('Token expired');
  } else if (!(error instanceof ApiError)) {
    error = ApiError.internal(env.isDevelopment ? error.message : 'Something went wrong');
  }

  const statusCode = error.statusCode || 500;

  if (statusCode >= 500) {
    logger.error(`${req.method} ${req.originalUrl} - ${err.message}`, { stack: err.stack });
  } else {
    logger.warn(`${req.method} ${req.originalUrl} - ${error.message}`);
  }

  if (error.extra && error.extra.retryAfterSeconds) {
    res.set('Retry-After', String(error.extra.retryAfterSeconds));
  }

  res.status(statusCode).json({
    success: false,
    message: error.message,
    ...(error.details ? { details: error.details } : {}),
    ...(error.mfaRequired ? { mfaRequired: true } : {}),
    ...(error.extra || {}),
    ...(env.isDevelopment && statusCode >= 500 ? { stack: err.stack } : {}),
  });
}

module.exports = errorMiddleware;
