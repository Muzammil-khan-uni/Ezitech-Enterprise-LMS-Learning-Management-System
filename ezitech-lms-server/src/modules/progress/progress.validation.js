const Joi = require('joi');

const videoPosition = Joi.object({
  positionSeconds: Joi.number().min(0).max(172800).required(),
});

module.exports = { videoPosition };
