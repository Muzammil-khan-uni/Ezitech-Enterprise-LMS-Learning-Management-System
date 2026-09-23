require('dotenv').config();

const required = ['MONGO_URI', 'REDIS_URL', 'JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET'];

const missing = required.filter((key) => !process.env[key]);

if (missing.length > 0) {
  throw new Error(
    `Missing required environment variables: ${missing.join(', ')}. ` +
      'Copy .env.example to .env and fill in real values.'
  );
}

const { durationToMs } = require('../utils/duration');

const PLACEHOLDER_SECRETS = ['change_me', 'changeme', 'secret', 'your_secret_here'];
if (process.env.NODE_ENV === 'production') {
  const weak = ['JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET', 'MFA_ENCRYPTION_KEY'].filter(
    (key) => PLACEHOLDER_SECRETS.includes(String(process.env[key] || '').toLowerCase()) || String(process.env[key] || '').length < 32
  );
  if (weak.length > 0) {
    throw new Error(
      `Refusing to start in production with weak or placeholder secrets: ${weak.join(', ')}. ` +
        'Use a unique random value of at least 32 characters for each.'
    );
  }
}

function positiveInt(raw, fallback) {
  const value = parseInt(raw, 10);
  return Number.isInteger(value) && value > 0 ? value : fallback;
}

function parseScormContentOrigin(isProduction) {
  const configured = (process.env.SCORM_CONTENT_ORIGIN || '').trim().replace(/\/$/, '');
  if (configured) return configured;
  if (isProduction) return null;
  return `http://127.0.0.1:${parseInt(process.env.PORT, 10) || 5000}`;
}

function parseTrustProxy(raw, isProduction) {
  if (raw === undefined || raw === '') return isProduction ? 1 : false;
  const value = String(raw).trim().toLowerCase();
  if (value === 'true') return true;
  if (value === 'false') return false;
  if (/^\d+$/.test(value)) return parseInt(value, 10);
  return String(raw).trim();
}

const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 5000,
  apiVersion: process.env.API_VERSION || 'v1',

  mongoUri: process.env.MONGO_URI,
  redisUrl: process.env.REDIS_URL,

  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET,
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    refreshTtlMs: durationToMs(process.env.JWT_REFRESH_EXPIRES_IN || '7d', 7 * 24 * 60 * 60 * 1000),
  },

  security: {
    maxLoginAttempts: positiveInt(process.env.LOGIN_MAX_ATTEMPTS, 5),
    lockMs: positiveInt(process.env.LOGIN_LOCK_MINUTES, 15) * 60 * 1000,
    failureWindowMs: positiveInt(process.env.LOGIN_FAILURE_WINDOW_MINUTES, 15) * 60 * 1000,
  },

  mfaEncryptionKey:
    process.env.MFA_ENCRYPTION_KEY ||
    require('crypto').createHash('sha256').update(`mfa-dev-key:${process.env.JWT_REFRESH_SECRET}`).digest('hex'),

  // Paid courses, coupons, subscriptions and revenue reporting are on by default, with or without a
  // payment gateway. Set PAYMENTS_ENABLED=false only if you need to switch them all off.
  paymentsEnabled: String(process.env.PAYMENTS_ENABLED || '').trim().toLowerCase() !== 'false',

  scormContentOrigin: parseScormContentOrigin(process.env.NODE_ENV === 'production'),

  trustProxy: parseTrustProxy(process.env.TRUST_PROXY, process.env.NODE_ENV === 'production'),

  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  serverPublicUrl: (process.env.SERVER_PUBLIC_URL || 'http://localhost:5000').replace(/\/$/, ''),
  logLevel: process.env.LOG_LEVEL || 'info',
  instructorCommissionPercent: Number(process.env.INSTRUCTOR_COMMISSION_PERCENT) || 70,

  smtp: {
    host: process.env.SMTP_HOST || '',
    port: parseInt(process.env.SMTP_PORT, 10) || 587,
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.SMTP_FROM || 'Ezitech LMS <no-reply@ezitech.example>',
  },

  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
    apiKey: process.env.CLOUDINARY_API_KEY || '',
    apiSecret: process.env.CLOUDINARY_API_SECRET || '',
  },

  isProduction: process.env.NODE_ENV === 'production',
  isDevelopment: (process.env.NODE_ENV || 'development') === 'development',
};

if (env.isProduction) {
  const insecure = [
    ['CLIENT_ORIGIN', env.clientOrigin],
    ['SERVER_PUBLIC_URL', env.serverPublicUrl],
  ].filter(([, value]) => !/^https:\/\//i.test(value));

  if (insecure.length > 0) {
    require('../utils/logger').warn(
      `Production is running with non-HTTPS public origins (${insecure.map(([key]) => key).join(', ')}). ` +
        'Secure cookies and email links will not work correctly without HTTPS.'
    );
  }
}

if (env.isProduction && !process.env.MFA_ENCRYPTION_KEY) {
  throw new Error(
    'MFA_ENCRYPTION_KEY is required in production. Use a unique random value of at least 32 characters.'
  );
}

if (env.scormContentOrigin) {
  const hostOf = (value) => {
    try {
      return new URL(value).hostname.toLowerCase();
    } catch {
      return null;
    }
  };
  const scormHost = hostOf(env.scormContentOrigin);
  if (!scormHost) {
    throw new Error('SCORM_CONTENT_ORIGIN must be a valid URL such as https://scorm.example.com');
  }
  const appHosts = [hostOf(env.clientOrigin), hostOf(env.serverPublicUrl)];
  if (env.isProduction && appHosts.includes(scormHost)) {
    throw new Error(
      'SCORM_CONTENT_ORIGIN must be a different hostname from CLIENT_ORIGIN and SERVER_PUBLIC_URL. ' +
        'Serving uploaded course content from the app origin would let it act as the logged-in user.'
    );
  }
}

module.exports = env;
