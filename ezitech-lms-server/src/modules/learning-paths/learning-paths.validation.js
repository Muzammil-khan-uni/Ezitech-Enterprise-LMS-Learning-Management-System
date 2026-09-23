const Joi = require('joi');

const objectId = Joi.string().hex().length(24);

const createPath = Joi.object({
  title: Joi.string().trim().max(200).required(),
  description: Joi.string().max(3000).allow('').optional(),
  level: Joi.string().valid('beginner', 'intermediate', 'advanced').required(),
});

const updatePath = createPath.fork(['title', 'level'], (s) => s.optional()).keys({
  isPublished: Joi.boolean().optional(),
});

const setCourses = Joi.object({
  courses: Joi.array()
    .items(
      Joi.object({
        course: objectId.required(),
        order: Joi.number().integer().min(0).required(),
      })
    )
    .required(),
});

module.exports = { createPath, updatePath, setCourses };
