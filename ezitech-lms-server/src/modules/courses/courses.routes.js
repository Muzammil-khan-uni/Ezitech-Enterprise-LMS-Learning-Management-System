const express = require('express');
const controller = require('./courses.controller');
const validate = require('../../middlewares/validate.middleware');
const requireAuth = require('../../middlewares/auth.middleware');
const optionalAuth = require('../../middlewares/optionalAuth.middleware');
const { authorize } = require('../../middlewares/rbac.middleware');
const schemas = require('./courses.validation');

const router = express.Router();

const CONTENT_CREATORS = ['instructor', 'course_manager', 'admin'];

router.get('/', optionalAuth, controller.listCourses);
router.get('/:courseId', optionalAuth, controller.getCourse);
router.get('/:courseId/sections', optionalAuth, controller.listSections);
router.get('/:courseId/lessons', optionalAuth, controller.listLessons);

router.get('/:courseId/lessons/:lessonId', optionalAuth, controller.getLesson);

router.use(requireAuth);

router.get('/:courseId/offline-package', controller.downloadOfflinePackage);
router.get('/:courseId/mentors', authorize(...CONTENT_CREATORS), controller.listCourseMentors);
router.put(
  '/:courseId/mentors',
  authorize('admin', 'course_manager'),
  validate(schemas.setMentors),
  controller.setCourseMentors
);

router.post('/', authorize(...CONTENT_CREATORS), validate(schemas.createCourse), controller.createCourse);
router.patch('/:courseId', authorize(...CONTENT_CREATORS), validate(schemas.updateCourse), controller.updateCourse);
router.delete('/:courseId', authorize(...CONTENT_CREATORS), controller.deleteCourse);
router.patch(
  '/:courseId/status',
  authorize(...CONTENT_CREATORS),
  validate(schemas.publishCourse),
  controller.setCourseStatus
);

router.post(
  '/:courseId/sections',
  authorize(...CONTENT_CREATORS),
  validate(schemas.createSection),
  controller.addSection
);
router.patch(
  '/:courseId/sections/reorder',
  authorize(...CONTENT_CREATORS),
  validate(schemas.reorderSections),
  controller.reorderSections
);
router.delete('/:courseId/sections/:sectionId', authorize(...CONTENT_CREATORS), controller.deleteSection);

router.post(
  '/:courseId/lessons',
  authorize(...CONTENT_CREATORS),
  validate(schemas.createLesson),
  controller.addLesson
);
router.patch(
  '/:courseId/lessons/:lessonId',
  authorize(...CONTENT_CREATORS),
  validate(schemas.updateLesson),
  controller.updateLesson
);
router.delete('/:courseId/lessons/:lessonId', authorize(...CONTENT_CREATORS), controller.deleteLesson);

module.exports = router;
