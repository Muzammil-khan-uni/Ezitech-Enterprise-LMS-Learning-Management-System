const catchAsync = require('../../utils/catchAsync');
const ApiResponse = require('../../utils/ApiResponse');
const env = require('../../config/env');
const authService = require('./auth.service');

const REFRESH_COOKIE_NAME = 'refreshToken';

const cookieOptions = {
  httpOnly: true,
  secure: env.isProduction,
  sameSite: env.isProduction ? 'strict' : 'lax',
  path: '/api/v1/auth',
};

const register = catchAsync(async (req, res) => {
  const user = await authService.register(req.body);
  new ApiResponse(201, user.toSafeObject(), 'Registration successful').send(res);
});

function setRefreshCookie(res, refreshToken) {
  res.cookie(REFRESH_COOKIE_NAME, refreshToken, {
    ...cookieOptions,
    maxAge: env.jwt.refreshTtlMs,
  });
}

const login = catchAsync(async (req, res) => {
  const { user, accessToken, refreshToken } = await authService.login(req.body, req);

  setRefreshCookie(res, refreshToken);

  new ApiResponse(200, { user, accessToken }, 'Login successful').send(res);
});

const refresh = catchAsync(async (req, res) => {
  const token = req.cookies?.[REFRESH_COOKIE_NAME];
  const { accessToken, refreshToken } = await authService.refresh(token);

  setRefreshCookie(res, refreshToken);

  new ApiResponse(200, { accessToken }, 'Token refreshed').send(res);
});

const logout = catchAsync(async (req, res) => {
  const token = req.cookies?.[REFRESH_COOKIE_NAME];
  await authService.logout(token);
  res.clearCookie(REFRESH_COOKIE_NAME, { path: cookieOptions.path });
  new ApiResponse(200, null, 'Logged out').send(res);
});

const listDevices = catchAsync(async (req, res) => {
  const devices = await authService.listDevices(req.user.id);
  new ApiResponse(200, devices).send(res);
});

const revokeDevice = catchAsync(async (req, res) => {
  await authService.revokeDevice(req.user.id, req.params.sessionId);
  new ApiResponse(200, null, 'Device session revoked').send(res);
});

const setupMfa = catchAsync(async (req, res) => {
  const result = await authService.setupMfa(req.user.id);
  new ApiResponse(200, result, 'Scan the QR code with your authenticator app, then verify').send(res);
});

const verifyMfa = catchAsync(async (req, res) => {
  const result = await authService.verifyAndEnableMfa(req.user.id, req.body.token);
  new ApiResponse(200, result, 'MFA enabled - save your recovery codes now, they will not be shown again').send(res);
});

const changePassword = catchAsync(async (req, res) => {
  const { accessToken, refreshToken } = await authService.changePassword(req.user.id, req.body, req);
  setRefreshCookie(res, refreshToken);
  new ApiResponse(200, { accessToken }, 'Password changed - other devices have been signed out').send(res);
});

const disableMfa = catchAsync(async (req, res) => {
  await authService.disableMfa(req.user.id, req.body);
  new ApiResponse(200, null, 'MFA disabled').send(res);
});

const setPassword = catchAsync(async (req, res) => {
  await authService.setPasswordWithToken(req.body.token, req.body.password);
  new ApiResponse(200, null, 'Password set - you can now log in').send(res);
});

const forgotPassword = catchAsync(async (req, res) => {
  await authService.requestPasswordReset(req.body.email);
  new ApiResponse(200, null, 'If that email is registered, a reset link has been sent').send(res);
});

const resetPassword = catchAsync(async (req, res) => {
  await authService.resetPassword(req.body.token, req.body.password);
  new ApiResponse(200, null, 'Password reset - you can now log in').send(res);
});

const verifyEmail = catchAsync(async (req, res) => {
  await authService.verifyEmail(req.body.token);
  new ApiResponse(200, null, 'Email verified').send(res);
});

const resendVerification = catchAsync(async (req, res) => {
  await authService.resendVerificationEmail(req.user.id);
  new ApiResponse(200, null, 'Verification email sent').send(res);
});

const recoveryCodeStatus = catchAsync(async (req, res) => {
  const count = await authService.getRecoveryCodeCount(req.user.id);
  new ApiResponse(200, { remaining: count }).send(res);
});

const regenerateRecoveryCodes = catchAsync(async (req, res) => {
  const result = await authService.regenerateRecoveryCodes(req.user.id, req.body);
  new ApiResponse(200, result, 'New recovery codes generated - save them now, they will not be shown again').send(res);
});

module.exports = {
  register,
  login,
  refresh,
  logout,
  listDevices,
  revokeDevice,
  setupMfa,
  verifyMfa,
  disableMfa,
  changePassword,
  recoveryCodeStatus,
  regenerateRecoveryCodes,
  setPassword,
  forgotPassword,
  resetPassword,
  verifyEmail,
  resendVerification,
};
