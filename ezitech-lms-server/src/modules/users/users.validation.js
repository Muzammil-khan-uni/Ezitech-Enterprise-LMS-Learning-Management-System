const Joi = require('joi');
const { ROLES } = require('../../models/User.model');

const CURRENT_YEAR = new Date().getFullYear();

function hostedOn(domain) {
  return (value, helpers) => {
    if (!value) return value;
    let host;
    try {
      host = new URL(value).hostname.toLowerCase();
    } catch {
      return helpers.error('string.uri');
    }
    if (host === domain || host.endsWith(`.${domain}`)) return value;
    return helpers.message(`{{#label}} must be a ${domain} link`);
  };
}

const socialLink = (domain) =>
  Joi.string()
    .trim()
    .max(200)
    .uri({ scheme: ['http', 'https'] })
    .custom(hostedOn(domain))
    .allow('', null);

const educationEntry = Joi.object({
  _id: Joi.string().hex().length(24).optional(),
  school: Joi.string().trim().min(2).max(120).required(),
  degree: Joi.string().trim().max(120).allow('', null).optional(),
  field: Joi.string().trim().max(120).allow('', null).optional(),
  startYear: Joi.number().integer().min(1950).max(CURRENT_YEAR + 10).allow(null).optional(),
  endYear: Joi.number().integer().min(1950).max(CURRENT_YEAR + 10).allow(null).optional(),
  description: Joi.string().trim().max(500).allow('', null).optional(),
}).custom((value, helpers) => {
  if (value.startYear && value.endYear && value.endYear < value.startYear) {
    return helpers.message('"endYear" cannot be earlier than "startYear"');
  }
  return value;
});

const updateBaseProfile = Joi.object({
  name: Joi.string().trim().min(2).max(100),
  phone: Joi.string()
    .trim()
    .pattern(/^\+?[0-9()\-.\s]{7,20}$/)
    .messages({ 'string.pattern.base': '"phone" must be a valid phone number' })
    .allow('', null),
  bio: Joi.string().trim().max(1000).allow('', null),
  skills: Joi.array().items(Joi.string().trim().min(1).max(40)).max(30),
  education: Joi.array().items(educationEntry).max(10),
  socialLinks: Joi.object({
    github: socialLink('github.com'),
    linkedin: socialLink('linkedin.com'),
  }),
}).min(1);

const changeEmail = Joi.object({
  email: Joi.string().trim().lowercase().email().max(254).required(),
  password: Joi.string().required(),
});

const updateRoleProfile = Joi.object({
  bio: Joi.string().max(2000).allow('').optional(),
  expertise: Joi.array().items(Joi.string()).optional(),
  interests: Joi.array().items(Joi.string()).optional(),
  currentLevel: Joi.string().valid('beginner', 'intermediate', 'advanced').optional(),
  socialLinks: Joi.object({
    website: Joi.string().uri().allow(''),
    linkedin: Joi.string().uri().allow(''),
    github: Joi.string().uri().allow(''),
  }).optional(),
}).min(1);

const setActive = Joi.object({
  isActive: Joi.boolean().required(),
});

const inviteUser = Joi.object({
  name: Joi.string().trim().max(100).required(),
  email: Joi.string().email().required(),
  role: Joi.string()
    .valid(...ROLES)
    .required(),
});

module.exports = { updateBaseProfile, changeEmail, updateRoleProfile, setActive, inviteUser };
