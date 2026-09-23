const express = require('express');
const controller = require('./learning-paths.controller');
const validate = require('../../middlewares/validate.middleware');
const requireAuth = require('../../middlewares/auth.middleware');
const optionalAuth = require('../../middlewares/optionalAuth.middleware');
const { authorize } = require('../../middlewares/rbac.middleware');
const schemas = require('./learning-paths.validation');

const router = express.Router();

const PATH_MANAGERS = ['course_manager', 'admin'];

router.get('/', optionalAuth, controller.listPaths);
router.get('/mine', requireAuth, controller.getMyPaths);
router.get('/:pathId', optionalAuth, controller.getPath);
router.get('/:pathId/my-progress', requireAuth, controller.getMyPathProgress);

router.use(requireAuth);
router.post('/', authorize(...PATH_MANAGERS), validate(schemas.createPath), controller.createPath);
router.patch('/:pathId', authorize(...PATH_MANAGERS), validate(schemas.updatePath), controller.updatePath);
router.put('/:pathId/courses', authorize(...PATH_MANAGERS), validate(schemas.setCourses), controller.setCourses);
router.delete('/:pathId', authorize(...PATH_MANAGERS), controller.deletePath);

module.exports = router;
