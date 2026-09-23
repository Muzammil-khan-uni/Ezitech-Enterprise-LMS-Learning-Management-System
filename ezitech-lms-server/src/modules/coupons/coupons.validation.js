const Joi = require('joi');

const objectId = Joi.string().hex().length(24);

const createCoupon = Joi.object({
  code: Joi.string().trim().uppercase().min(3).max(40).required(),
  discountType: Joi.string().valid('percentage', 'fixed').required(),
  discountValue: Joi.number().min(0).required(),
  applicableCourses: Joi.array().items(objectId).optional(),
  maxRedemptions: Joi.number().integer().min(1).allow(null).optional(),
  expiresAt: Joi.date().greater('now').allow(null).optional(),
  isActive: Joi.boolean().optional(),
})
  .when(Joi.object({ discountType: Joi.valid('percentage') }).unknown(), {
    then: Joi.object({ discountValue: Joi.number().min(0).max(100).required() }),
  });

const validateCoupon = Joi.object({
  code: Joi.string().trim().required(),
  courseId: objectId.required(),
});

module.exports = { createCoupon, validateCoupon };
