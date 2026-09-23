const express = require('express');
const controller = require('./certificates.controller');
const requireAuth = require('../../middlewares/auth.middleware');
const { authorize } = require('../../middlewares/rbac.middleware');

const router = express.Router();

router.get('/verify/:code', controller.verify);

router.use(requireAuth);

router.get('/me', controller.listMine);
router.get('/:certificateId', controller.getCertificate);
router.get('/:certificateId/download', controller.download);
router.patch('/:certificateId/revoke', authorize('admin'), controller.revoke);

module.exports = router;
