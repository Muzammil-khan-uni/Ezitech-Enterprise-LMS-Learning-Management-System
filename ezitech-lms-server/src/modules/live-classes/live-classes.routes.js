const express = require('express');
const Joi = require('joi');
const catchAsync = require('../../utils/catchAsync');
const ApiResponse = require('../../utils/ApiResponse');
const requireAuth = require('../../middlewares/auth.middleware');
const { authorize } = require('../../middlewares/rbac.middleware');
const validate = require('../../middlewares/validate.middleware');
const service = require('./live-classes.service');

const router = express.Router();

const CONTENT_CREATORS = ['instructor', 'course_manager', 'admin'];

const scheduleSchema = Joi.object({
  title: Joi.string().trim().max(200).required(),
  description: Joi.string().max(2000).allow('').optional(),
  scheduledAt: Joi.date().required(),
});

router.use(requireAuth);

router.post(
  '/courses/:courseId',
  authorize(...CONTENT_CREATORS),
  validate(scheduleSchema),
  catchAsync(async (req, res) => {
    const session = await service.scheduleSession(req.params.courseId, req.body, req.user);
    new ApiResponse(201, session, 'Live class scheduled').send(res);
  })
);

router.get(
  '/courses/:courseId',
  catchAsync(async (req, res) => {
    const sessions = await service.listSessionsForCourse(req.params.courseId, req.user);
    new ApiResponse(200, sessions).send(res);
  })
);

router.get(
  '/:sessionId',
  catchAsync(async (req, res) => {
    const session = await service.getSession(req.params.sessionId);
    await service.assertCanJoin(session, req.user);
    new ApiResponse(200, session).send(res);
  })
);

router.post(
  '/:sessionId/start',
  authorize(...CONTENT_CREATORS),
  catchAsync(async (req, res) => {
    const session = await service.startSession(req.params.sessionId, req.user);
    new ApiResponse(200, session, 'Live class started').send(res);
  })
);

router.post(
  '/:sessionId/end',
  authorize(...CONTENT_CREATORS),
  catchAsync(async (req, res) => {
    const session = await service.endSession(req.params.sessionId, req.user);
    new ApiResponse(200, session, 'Live class ended').send(res);
  })
);

module.exports = router;
