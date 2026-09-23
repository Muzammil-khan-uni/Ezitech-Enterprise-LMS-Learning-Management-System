const express = require('express');
const controller = require('./discussions.controller');
const validate = require('../../middlewares/validate.middleware');
const requireAuth = require('../../middlewares/auth.middleware');
const schemas = require('./discussions.validation');

const router = express.Router();

router.use(requireAuth);

router.get('/courses/:courseId/threads', controller.listThreads);
router.post('/courses/:courseId/threads', validate(schemas.createThread), controller.createThread);

router.get('/threads/:threadId', controller.getThread);
router.patch('/threads/:threadId', validate(schemas.setThreadFlags), controller.setThreadFlags);
router.delete('/threads/:threadId', controller.deleteThread);

router.get('/threads/:threadId/comments', controller.listComments);
router.post('/threads/:threadId/comments', validate(schemas.addComment), controller.addComment);
router.delete('/comments/:commentId', controller.deleteComment);

module.exports = router;
