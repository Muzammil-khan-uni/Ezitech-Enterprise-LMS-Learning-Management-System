const catchAsync = require('../../utils/catchAsync');
const ApiResponse = require('../../utils/ApiResponse');
const service = require('./learning-paths.service');

const createPath = catchAsync(async (req, res) => {
  const path = await service.createPath(req.body, req.user.id);
  new ApiResponse(201, path, 'Learning path created').send(res);
});

const listPaths = catchAsync(async (req, res) => {
  const { level, isPublished } = req.query;
  const paths = await service.listPaths(
    { level, isPublished: isPublished === undefined ? undefined : isPublished === 'true' },
    req.user
  );
  new ApiResponse(200, paths).send(res);
});

const getPath = catchAsync(async (req, res) => {
  const path = await service.getPath(req.params.pathId, req.user);
  new ApiResponse(200, path).send(res);
});

const updatePath = catchAsync(async (req, res) => {
  const path = await service.updatePath(req.params.pathId, req.body);
  new ApiResponse(200, path, 'Learning path updated').send(res);
});

const setCourses = catchAsync(async (req, res) => {
  const path = await service.setCourses(req.params.pathId, req.body.courses);
  new ApiResponse(200, path, 'Learning path courses updated').send(res);
});

const deletePath = catchAsync(async (req, res) => {
  await service.deletePath(req.params.pathId);
  new ApiResponse(200, null, 'Learning path deleted').send(res);
});

const getMyPaths = catchAsync(async (req, res) => {
  const paths = await service.getMyStartedPaths(req.user.id);
  new ApiResponse(200, paths).send(res);
});

const getMyPathProgress = catchAsync(async (req, res) => {
  const progress = await service.getPathProgress(req.user.id, req.params.pathId);
  new ApiResponse(200, progress).send(res);
});

module.exports = { createPath, listPaths, getPath, updatePath, setCourses, deletePath, getMyPaths, getMyPathProgress };
