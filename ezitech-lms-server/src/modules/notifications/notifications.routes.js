const express = require('express');
const controller = require('./notifications.controller');
const requireAuth = require('../../middlewares/auth.middleware');

const router = express.Router();

router.use(requireAuth);

router.get('/', controller.listMine);
router.patch('/:notificationId/read', controller.markRead);
router.patch('/read-all', controller.markAllRead);

module.exports = router;
