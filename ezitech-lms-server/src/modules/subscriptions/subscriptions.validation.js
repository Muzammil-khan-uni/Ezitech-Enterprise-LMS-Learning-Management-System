const Joi = require('joi');

const objectId = Joi.string().hex().length(24);

const coursesIncluded = Joi.alternatives().try(Joi.string().valid('all'), Joi.array().items(objectId));

const createPlan = Joi.object({
  name: Joi.string().trim().max(200).required(),
  description: Joi.string().max(2000).allow('').optional(),
  price: Joi.number().min(0).required(),
  durationDays: Joi.number().integer().min(1).required(),
  coursesIncluded: coursesIncluded.optional(),
  isActive: Joi.boolean().optional(),
});

const updatePlan = createPlan.fork(['name', 'price', 'durationDays'], (s) => s.optional()).min(1);

module.exports = { createPlan, updatePlan };
