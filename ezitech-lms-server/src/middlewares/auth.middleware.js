const catchAsync = require('../utils/catchAsync');
const ApiError = require('../utils/ApiError');
const { verifyAccessToken } = require('../utils/tokenUtils');
const { User } = require('../models/User.model');

const requireAuth = catchAsync(async (req, res, next) => {
  const header = req.headers.authorization;

  if (!header || !header.startsWith('Bearer ')) {
    throw ApiError.unauthorized('Authentication token missing');
  }

  const token = header.split(' ')[1];

  const payload = verifyAccessToken(token);

  const user = await User.findById(payload.sub).select('_id role permissions isActive');
  if (!user || !user.isActive) {
    throw ApiError.unauthorized('Account no longer active');
  }

  req.user = {
    id: user._id.toString(),
    role: user.role,
    permissions: user.permissions || [],
  };

  next();
});

module.exports = requireAuth;
