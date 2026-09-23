const { verifyAccessToken } = require('../utils/tokenUtils');
const { User } = require('../models/User.model');

async function optionalAuth(req, res, next) {
  const header = req.headers.authorization;

  if (!header || !header.startsWith('Bearer ')) {
    return next();
  }

  try {
    const payload = verifyAccessToken(header.split(' ')[1]);
    const user = await User.findById(payload.sub).select('_id role permissions isActive');

    if (user && user.isActive) {
      req.user = {
        id: user._id.toString(),
        role: user.role,
        permissions: user.permissions || [],
      };
    }
  } catch {
    req.user = undefined;
  }

  next();
}

module.exports = optionalAuth;
