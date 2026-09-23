const catchAsync = require('../../utils/catchAsync');
const ApiResponse = require('../../utils/ApiResponse');
const service = require('./discussions.service');

const createThread = catchAsync(async (req, res) => {
  const thread = await service.createThread(req.params.courseId, req.body, req.user);
  new ApiResponse(201, thread, 'Thread created').send(res);
});

const listThreads = catchAsync(async (req, res) => {
  const { lesson, announcementsOnly } = req.query;
  const threads = await service.listThreads(
    req.params.courseId,
    { lesson, announcementsOnly: announcementsOnly === 'true' },
    req.user
  );
  new ApiResponse(200, threads).send(res);
});

const getThread = catchAsync(async (req, res) => {
  const thread = await service.getThread(req.params.threadId, req.user);
  new ApiResponse(200, thread).send(res);
});

const setThreadFlags = catchAsync(async (req, res) => {
  const thread = await service.setThreadFlags(req.params.threadId, req.body, req.user);
  new ApiResponse(200, thread, 'Thread updated').send(res);
});

const deleteThread = catchAsync(async (req, res) => {
  await service.deleteThread(req.params.threadId, req.user);
  new ApiResponse(200, null, 'Thread deleted').send(res);
});

const addComment = catchAsync(async (req, res) => {
  const comment = await service.addComment(req.params.threadId, req.body.body, req.body.parentComment, req.user);
  new ApiResponse(201, comment, 'Reply posted').send(res);
});

const listComments = catchAsync(async (req, res) => {
  const comments = await service.listComments(req.params.threadId, req.user);
  new ApiResponse(200, comments).send(res);
});

const deleteComment = catchAsync(async (req, res) => {
  await service.deleteComment(req.params.commentId, req.user);
  new ApiResponse(200, null, 'Comment deleted').send(res);
});

module.exports = {
  createThread,
  listThreads,
  getThread,
  setThreadFlags,
  deleteThread,
  addComment,
  listComments,
  deleteComment,
};
