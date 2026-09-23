const catchAsync = require('../../utils/catchAsync');
const ApiResponse = require('../../utils/ApiResponse');
const service = require('./progress.service');

const markComplete = catchAsync(async (req, res) => {
  const result = await service.markLessonComplete(req.user.id, req.params.courseId, req.params.lessonId);
  new ApiResponse(200, result, 'Lesson marked complete').send(res);
});

const markIncomplete = catchAsync(async (req, res) => {
  const result = await service.markLessonIncomplete(req.user.id, req.params.courseId, req.params.lessonId);
  new ApiResponse(200, result, 'Lesson marked incomplete').send(res);
});

const getForCourse = catchAsync(async (req, res) => {
  const result = await service.getCourseProgress(req.user.id, req.params.courseId);
  new ApiResponse(200, result).send(res);
});

const updateVideoPosition = catchAsync(async (req, res) => {
  const result = await service.updateVideoPosition(
    req.user.id,
    req.params.courseId,
    req.params.lessonId,
    req.body.positionSeconds
  );
  new ApiResponse(200, result).send(res);
});

const getVideoPosition = catchAsync(async (req, res) => {
  const result = await service.getVideoPosition(req.user.id, req.params.lessonId);
  new ApiResponse(200, result).send(res);
});

module.exports = { markComplete, markIncomplete, getForCourse, updateVideoPosition, getVideoPosition };
