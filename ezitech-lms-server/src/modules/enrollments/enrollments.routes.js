const express = require('express');
const controller = require('./enrollments.controller');
const validate = require('../../middlewares/validate.middleware');
const requireAuth = require('../../middlewares/auth.middleware');
const { authorize } = require('../../middlewares/rbac.middleware');
const schemas = require('./enrollments.validation');

const router = express.Router();

router.use(requireAuth);

router.get('/me', controller.listMine);
router.post('/', validate(schemas.enroll), controller.enroll);
router.post('/learning-paths/:pathId', controller.enrollInPath);
router.patch('/:courseId/drop', controller.drop);

router.get(
  '/courses/:courseId',
  authorize('instructor', 'course_manager', 'admin', 'mentor'),
  controller.listForCourse
);

module.exports = router;
