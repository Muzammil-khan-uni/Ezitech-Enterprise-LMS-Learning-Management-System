const express = require('express');
const controller = require('./assessments.controller');
const validate = require('../../middlewares/validate.middleware');
const requireAuth = require('../../middlewares/auth.middleware');
const { authorize } = require('../../middlewares/rbac.middleware');
const schemas = require('./assessments.validation');

const router = express.Router();

const CONTENT_CREATORS = ['instructor', 'course_manager', 'admin'];

router.use(requireAuth);

router.get('/course/:courseId', controller.listForCourse);
router.get('/:assessmentId', controller.getAssessment);

router.post('/', authorize(...CONTENT_CREATORS), validate(schemas.createAssessment), controller.createAssessment);
router.patch('/:assessmentId', authorize(...CONTENT_CREATORS), validate(schemas.updateAssessment), controller.updateAssessment);
router.delete('/:assessmentId', authorize(...CONTENT_CREATORS), controller.deleteAssessment);

router.post('/:assessmentId/attempts', controller.startAttempt);
router.post(
  '/attempts/:submissionId/submit',
  validate(schemas.submitAttempt),
  controller.submitAttempt
);
router.get('/:assessmentId/attempts/me', controller.listMySubmissions);

router.get(
  '/:assessmentId/submissions',
  authorize(...CONTENT_CREATORS, 'mentor'),
  controller.listForGrading
);
router.patch(
  '/submissions/:submissionId/grade',
  authorize(...CONTENT_CREATORS, 'mentor'),
  validate(schemas.gradeSubmission),
  controller.gradeSubmission
);

module.exports = router;
