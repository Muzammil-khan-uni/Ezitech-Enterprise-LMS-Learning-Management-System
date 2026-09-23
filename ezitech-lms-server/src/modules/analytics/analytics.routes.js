const express = require('express');
const catchAsync = require('../../utils/catchAsync');
const ApiResponse = require('../../utils/ApiResponse');
const requireAuth = require('../../middlewares/auth.middleware');
const { authorize } = require('../../middlewares/rbac.middleware');
const service = require('./analytics.service');

const router = express.Router();

router.use(requireAuth);

router.get(
  '/student',
  catchAsync(async (req, res) => {
    const dashboard = await service.getStudentDashboard(req.user.id);
    new ApiResponse(200, dashboard).send(res);
  })
);

router.get(
  '/student/statistics',
  catchAsync(async (req, res) => {
    const stats = await service.getLearningStatistics(req.user.id);
    new ApiResponse(200, stats).send(res);
  })
);

router.get(
  '/mentor',
  authorize('mentor'),
  catchAsync(async (req, res) => {
    const dashboard = await service.getMentorDashboard(req.user.id);
    new ApiResponse(200, dashboard).send(res);
  })
);

router.get(
  '/instructor',
  authorize('instructor', 'course_manager', 'admin'),
  catchAsync(async (req, res) => {
    const dashboard = await service.getInstructorDashboard(req.user.id);
    new ApiResponse(200, dashboard).send(res);
  })
);

router.get(
  '/instructor/feedback-reports',
  authorize('instructor', 'course_manager', 'admin'),
  catchAsync(async (req, res) => {
    const reviewsService = require('../reviews/reviews.service');
    const reports = await reviewsService.getInstructorFeedback(req.user.id);
    new ApiResponse(200, reports).send(res);
  })
);

router.get(
  '/instructor/earnings',
  authorize('instructor', 'course_manager', 'admin'),
  catchAsync(async (req, res) => {
    const earnings = await service.getInstructorEarnings(req.user.id);
    new ApiResponse(200, earnings).send(res);
  })
);

router.get(
  '/admin',
  authorize('admin'),
  catchAsync(async (req, res) => {
    const analytics = await service.getAdminAnalytics();
    new ApiResponse(200, analytics).send(res);
  })
);

module.exports = router;
