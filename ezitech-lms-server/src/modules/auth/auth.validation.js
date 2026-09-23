const Joi = require('joi');

const register = Joi.object({
  name: Joi.string().trim().max(100).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(8).max(128).required(),
});

const login = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
  mfaToken: Joi.string().pattern(/^\d{6}$/).optional(),
  recoveryCode: Joi.string().min(6).max(64).optional(),
}).oxor('mfaToken', 'recoveryCode');

const mfaVerify = Joi.object({
  token: Joi.string().pattern(/^\d{6}$/).required(),
});

const mfaDisable = Joi.object({
  password: Joi.string().required(),
  token: Joi.string().pattern(/^\d{6}$/).optional(),
  recoveryCode: Joi.string().min(6).max(64).optional(),
}).xor('token', 'recoveryCode');

const mfaRegenerate = Joi.object({
  password: Joi.string().required(),
  token: Joi.string().pattern(/^\d{6}$/).required(),
});

const changePassword = Joi.object({
  currentPassword: Joi.string().required(),
  newPassword: Joi.string().min(8).max(128).required(),
});

const setPassword = Joi.object({
  token: Joi.string().required(),
  password: Joi.string().min(8).max(128).required(),
});

const forgotPassword = Joi.object({
  email: Joi.string().email().required(),
});

const resetPassword = Joi.object({
  token: Joi.string().required(),
  password: Joi.string().min(8).max(128).required(),
});

const verifyEmail = Joi.object({
  token: Joi.string().required(),
});

module.exports = {
  register,
  login,
  mfaVerify,
  mfaDisable,
  mfaRegenerate,
  changePassword,
  setPassword,
  forgotPassword,
  resetPassword,
  verifyEmail,
};
