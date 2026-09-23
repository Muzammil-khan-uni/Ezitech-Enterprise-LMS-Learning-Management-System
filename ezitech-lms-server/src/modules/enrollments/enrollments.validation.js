const Joi = require('joi');

const enroll = Joi.object({
  courseId: Joi.string().hex().length(24).required(),
  couponCode: Joi.string().trim().uppercase().optional(),
});

module.exports = { enroll };
