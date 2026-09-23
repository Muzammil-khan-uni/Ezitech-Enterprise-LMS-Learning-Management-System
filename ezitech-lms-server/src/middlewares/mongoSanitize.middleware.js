function sanitizeInPlace(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  for (const key of Object.keys(obj)) {
    if (key.startsWith('$') || key.includes('.')) {
      delete obj[key];
    } else if (obj[key] && typeof obj[key] === 'object') {
      sanitizeInPlace(obj[key]);
    }
  }
  return obj;
}

function mongoSanitizeMiddleware(req, res, next) {
  if (req.body) sanitizeInPlace(req.body);
  if (req.params) sanitizeInPlace(req.params);

  if (req.query) {
    const sanitizedQuery = sanitizeInPlace({ ...req.query });
    Object.defineProperty(req, 'query', {
      value: sanitizedQuery,
      writable: true,
      configurable: true,
      enumerable: true,
    });
  }

  next();
}

module.exports = mongoSanitizeMiddleware;
