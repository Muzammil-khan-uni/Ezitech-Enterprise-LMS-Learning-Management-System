const catchAsync = require('../../utils/catchAsync');
const ApiResponse = require('../../utils/ApiResponse');
const ApiError = require('../../utils/ApiError');
const usersService = require('./users.service');

const getMe = catchAsync(async (req, res) => {
  const profile = await usersService.getFullProfile(req.user.id);
  new ApiResponse(200, profile).send(res);
});

const updateMe = catchAsync(async (req, res) => {
  const user = await usersService.updateBaseProfile(req.user.id, req.body);
  new ApiResponse(200, user, 'Profile updated').send(res);
});

const uploadAvatar = catchAsync(async (req, res) => {
  if (!req.file) throw ApiError.badRequest('No image was provided (expected form field "file")');
  const user = await usersService.setAvatar(req.user.id, req.file.path);
  new ApiResponse(200, user, 'Profile photo updated').send(res);
});

const removeAvatar = catchAsync(async (req, res) => {
  const user = await usersService.removeAvatar(req.user.id);
  new ApiResponse(200, user, 'Profile photo removed').send(res);
});

const changeEmail = catchAsync(async (req, res) => {
  const user = await usersService.changeEmail(req.user.id, req.body);
  new ApiResponse(200, user, 'Email updated - please verify your new address').send(res);
});

const listMentors = catchAsync(async (req, res) => {
  const mentors = await usersService.listMentors();
  new ApiResponse(200, mentors).send(res);
});

const unlockUser = catchAsync(async (req, res) => {
  const user = await usersService.unlockUser(req.params.userId);
  new ApiResponse(200, user, 'Account unlocked').send(res);
});

const updateMyRoleProfile = catchAsync(async (req, res) => {
  const profile = await usersService.updateRoleProfile(req.user.id, req.body);
  new ApiResponse(200, profile, 'Profile updated').send(res);
});

const listUsers = catchAsync(async (req, res) => {
  const { role, status, search, page, limit } = req.query;
  const result = await usersService.listUsers({
    role,
    status,
    search,
    page: page ? parseInt(page, 10) : undefined,
    limit: limit ? parseInt(limit, 10) : undefined,
  });
  new ApiResponse(200, result.items, undefined, result.pagination).send(res);
});

const inviteUser = catchAsync(async (req, res) => {
  const user = await usersService.inviteUser(req.body);
  new ApiResponse(201, user, 'Invitation sent').send(res);
});

const setUserActive = catchAsync(async (req, res) => {
  const user = await usersService.setUserActive(req.params.userId, req.body.isActive);
  new ApiResponse(200, user, 'User status updated').send(res);
});

module.exports = { getMe, updateMe, unlockUser, listMentors, uploadAvatar, removeAvatar, changeEmail, updateMyRoleProfile, listUsers, inviteUser, setUserActive };
