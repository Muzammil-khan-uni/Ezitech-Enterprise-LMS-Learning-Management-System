const catchAsync = require('../../utils/catchAsync');
const ApiResponse = require('../../utils/ApiResponse');
const service = require('./enrollments.service');

const enroll = catchAsync(async (req, res) => {
  const enrollment = await service.enroll(req.user.id, req.body.courseId, req.body.couponCode);
  new ApiResponse(201, enrollment, 'Enrolled successfully').send(res);
});

const enrollInPath = catchAsync(async (req, res) => {
  const enrollment = await service.enrollInLearningPath(req.user.id, req.params.pathId);
  new ApiResponse(201, enrollment, 'Enrolled in the first course of this path').send(res);
});

const drop = catchAsync(async (req, res) => {
  const enrollment = await service.drop(req.user.id, req.params.courseId);
  new ApiResponse(200, enrollment, 'Enrollment dropped').send(res);
});

const listMine = catchAsync(async (req, res) => {
  const enrollments = await service.listMyEnrollments(req.user.id, req.query.status);
  new ApiResponse(200, enrollments).send(res);
});

const listForCourse = catchAsync(async (req, res) => {
  const enrollments = await service.listCourseEnrollments(req.params.courseId, req.user);
  new ApiResponse(200, enrollments).send(res);
});

module.exports = { enroll, enrollInPath, drop, listMine, listForCourse };
