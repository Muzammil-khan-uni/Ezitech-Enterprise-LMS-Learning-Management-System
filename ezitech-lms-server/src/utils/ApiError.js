class ApiError extends Error {
  constructor(statusCode, message, isOperational = true, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message = 'Bad request', details = null) {
    return new ApiError(400, message, true, details);
  }

  static unauthorized(message = 'Unauthorized') {
    return new ApiError(401, message);
  }

  static forbidden(message = 'Forbidden') {
    return new ApiError(403, message);
  }

  static notFound(message = 'Resource not found') {
    return new ApiError(404, message);
  }

  static conflict(message = 'Conflict') {
    return new ApiError(409, message);
  }

  static tooManyRequests(message = 'Too many requests', extra = null) {
    const error = new ApiError(429, message);
    error.extra = extra;
    return error;
  }

  static payloadTooLarge(message = 'Payload too large') {
    return new ApiError(413, message);
  }

  static internal(message = 'Internal server error') {
    return new ApiError(500, message, false);
  }
}

module.exports = ApiError;
