const Joi = require('joi');

const objectId = Joi.string().hex().length(24);

const createThread = Joi.object({
  lesson: objectId.optional(),
  title: Joi.string().trim().max(200).required(),
  body: Joi.string().max(5000).required(),
  isAnnouncement: Joi.boolean().optional(),
});

const setThreadFlags = Joi.object({
  isPinned: Joi.boolean().optional(),
  isLocked: Joi.boolean().optional(),
}).min(1);

const addComment = Joi.object({
  body: Joi.string().max(3000).required(),
  parentComment: objectId.optional(),
});

module.exports = { createThread, setThreadFlags, addComment };
