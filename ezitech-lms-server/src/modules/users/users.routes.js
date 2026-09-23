const express = require('express');
const controller = require('./users.controller');
const validate = require('../../middlewares/validate.middleware');
const requireAuth = require('../../middlewares/auth.middleware');
const { authorize } = require('../../middlewares/rbac.middleware');
const schemas = require('./users.validation');
const { createRateLimiter } = require('../../middlewares/rateLimiter');
const { uploadMiddlewareFor, friendlyUploadError } = require('../../middlewares/upload.middleware');

const emailChangeLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: 'Too many email change attempts, please try again later',
  prefix: 'change-email',
});

const avatarLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  max: 20,
  message: 'Too many photo uploads, please try again later',
  prefix: 'avatar-upload',
});

function receiveAvatar(req, res, next) {
  uploadMiddlewareFor('avatar')(req, res, (err) => {
    if (err) return next(friendlyUploadError(err, 'avatar'));
    next();
  });
}

const router = express.Router();

router.use(requireAuth);

router.get('/me', controller.getMe);
router.patch('/me', validate(schemas.updateBaseProfile), controller.updateMe);
router.post('/me/avatar', avatarLimiter, receiveAvatar, controller.uploadAvatar);
router.delete('/me/avatar', controller.removeAvatar);
router.post('/me/email', emailChangeLimiter, validate(schemas.changeEmail), controller.changeEmail);
router.patch('/me/role-profile', validate(schemas.updateRoleProfile), controller.updateMyRoleProfile);

router.get('/mentors', authorize('admin', 'course_manager'), controller.listMentors);
router.get('/', authorize('admin'), controller.listUsers);
router.post('/:userId/unlock', authorize('admin'), controller.unlockUser);
router.post('/invite', authorize('admin'), validate(schemas.inviteUser), controller.inviteUser);
router.patch(
  '/:userId/status',
  authorize('admin'),
  validate(schemas.setActive),
  controller.setUserActive
);

module.exports = router;
