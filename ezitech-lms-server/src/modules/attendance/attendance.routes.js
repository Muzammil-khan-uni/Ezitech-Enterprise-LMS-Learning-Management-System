const express = require('express');
const catchAsync = require('../../utils/catchAsync');
const ApiResponse = require('../../utils/ApiResponse');
const requireAuth = require('../../middlewares/auth.middleware');
const service = require('./attendance.service');

const router = express.Router();

router.use(requireAuth);

router.get(
  '/me',
  catchAsync(async (req, res) => {
    const records = await service.listMyAttendance(req.user.id);
    new ApiResponse(200, records).send(res);
  })
);

router.get(
  '/live-classes/:sessionId',
  catchAsync(async (req, res) => {
    const records = await service.listSessionAttendance(req.params.sessionId, req.user);
    new ApiResponse(200, records).send(res);
  })
);

module.exports = router;
