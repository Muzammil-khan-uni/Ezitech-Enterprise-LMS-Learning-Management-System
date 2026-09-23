const cloudinary = require('cloudinary').v2;
const env = require('./env');
const logger = require('../utils/logger');

const isConfigured = Boolean(env.cloudinary.cloudName && env.cloudinary.apiKey && env.cloudinary.apiSecret);

if (!isConfigured) {
  if (env.isProduction) {
    throw new Error(
      'CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET are required in production'
    );
  }
  logger.warn('Cloudinary is not configured - file upload endpoints will return an error until it is (dev only)');
}

cloudinary.config({
  cloud_name: env.cloudinary.cloudName,
  api_key: env.cloudinary.apiKey,
  api_secret: env.cloudinary.apiSecret,
  secure: true,
});

module.exports = { cloudinary, isConfigured: () => isConfigured };
