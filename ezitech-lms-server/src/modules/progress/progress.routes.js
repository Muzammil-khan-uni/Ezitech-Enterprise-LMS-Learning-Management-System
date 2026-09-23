const express = require('express');
const controller = require('./progress.controller');
const requireAuth = require('../../middlewares/auth.middleware');
const validate = require('../../middlewares/validate.middleware');
const schemas = require('./progress.validation');

const router = express.Router();

router.use(requireAuth);

router.get('/courses/:courseId', controller.getForCourse);
router.post('/courses/:courseId/lessons/:lessonId/complete', controller.markComplete);
router.post('/courses/:courseId/lessons/:lessonId/incomplete', controller.markIncomplete);
router.post(
  '/courses/:courseId/lessons/:lessonId/video-position',
  validate(schemas.videoPosition),
  controller.updateVideoPosition
);
router.get('/lessons/:lessonId/video-position', controller.getVideoPosition);

module.exports = router;
