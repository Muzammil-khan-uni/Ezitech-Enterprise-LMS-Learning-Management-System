const catchAsync = require('../../utils/catchAsync');
const ApiResponse = require('../../utils/ApiResponse');
const service = require('./notifications.service');

const listMine = catchAsync(async (req, res) => {
  const { unreadOnly, page, limit } = req.query;
  const result = await service.listMine(req.user.id, {
    unreadOnly: unreadOnly === 'true',
    page: page ? parseInt(page, 10) : undefined,
    limit: limit ? parseInt(limit, 10) : undefined,
  });
  new ApiResponse(200, result.items, undefined, {
    ...result.pagination,
    unreadCount: result.unreadCount,
  }).send(res);
});

const markRead = catchAsync(async (req, res) => {
  const notification = await service.markRead(req.user.id, req.params.notificationId);
  new ApiResponse(200, notification).send(res);
});

const markAllRead = catchAsync(async (req, res) => {
  await service.markAllRead(req.user.id);
  new ApiResponse(200, null, 'All notifications marked as read').send(res);
});

module.exports = { listMine, markRead, markAllRead };
