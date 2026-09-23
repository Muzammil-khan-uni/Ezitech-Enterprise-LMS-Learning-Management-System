const express = require('express');
const controller = require('./auth.controller');
const validate = require('../../middlewares/validate.middleware');
const requireAuth = require('../../middlewares/auth.middleware');
const requireTrustedOrigin = require('../../middlewares/trustedOrigin.middleware');
const { createRateLimiter } = require('../../middlewares/rateLimiter');
const schemas = require('./auth.validation');

const router = express.Router();

const authLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: 'Too many attempts, please try again later',
  prefix: 'auth',
  failOpen: false,
});

const refreshLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 120,
  message: 'Too many token refresh attempts, please try again later',
  prefix: 'auth-refresh',
});

const sensitiveLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Too many attempts, please try again later',
  prefix: 'auth-sensitive',
  failOpen: false,
});

router.post('/register', authLimiter, validate(schemas.register), controller.register);
router.post('/login', authLimiter, validate(schemas.login), controller.login);
router.post('/refresh', requireTrustedOrigin, refreshLimiter, controller.refresh);
router.post('/logout', requireTrustedOrigin, controller.logout);
router.post('/set-password', authLimiter, validate(schemas.setPassword), controller.setPassword);

router.post('/forgot-password', authLimiter, validate(schemas.forgotPassword), controller.forgotPassword);
router.post('/reset-password', authLimiter, validate(schemas.resetPassword), controller.resetPassword);
router.post('/verify-email', authLimiter, validate(schemas.verifyEmail), controller.verifyEmail);

router.get('/devices', requireAuth, controller.listDevices);
router.delete('/devices/:sessionId', requireAuth, controller.revokeDevice);

router.post('/resend-verification', requireAuth, controller.resendVerification);

router.post('/mfa/setup', requireAuth, controller.setupMfa);
router.post('/mfa/verify', requireAuth, sensitiveLimiter, validate(schemas.mfaVerify), controller.verifyMfa);
router.post('/mfa/disable', requireAuth, sensitiveLimiter, validate(schemas.mfaDisable), controller.disableMfa);
router.get('/mfa/recovery-codes', requireAuth, controller.recoveryCodeStatus);
router.post(
  '/mfa/recovery-codes/regenerate',
  requireAuth,
  sensitiveLimiter,
  validate(schemas.mfaRegenerate),
  controller.regenerateRecoveryCodes
);

router.post('/change-password', requireAuth, sensitiveLimiter, validate(schemas.changePassword), controller.changePassword);

module.exports = router;
