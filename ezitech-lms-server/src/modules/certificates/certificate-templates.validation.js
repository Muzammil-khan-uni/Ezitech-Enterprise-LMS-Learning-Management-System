const Joi = require('joi');

const hexColor = Joi.string().pattern(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/);

const createTemplate = Joi.object({
  name: Joi.string().trim().max(200).required(),
  isDefault: Joi.boolean().optional(),
  primaryColor: hexColor.optional(),
  signatureName: Joi.string().trim().max(200).optional(),
  signatureTitle: Joi.string().trim().max(200).optional(),
  logoUrl: Joi.string().uri().allow('').optional(),
  footerText: Joi.string().max(500).allow('').optional(),
});

const updateTemplate = createTemplate.fork(['name'], (s) => s.optional()).min(1);

module.exports = { createTemplate, updateTemplate };
