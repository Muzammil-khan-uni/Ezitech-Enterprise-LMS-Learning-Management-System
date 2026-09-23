const Joi = require('joi');
const { COURSE_LANGUAGES } = require('../../models/Course.model');

const objectId = Joi.string().hex().length(24);

const createCourse = Joi.object({
  title: Joi.string().trim().max(200).required(),
  description: Joi.string().max(5000).allow(''),
  category: objectId.required(),
  tags: Joi.array().items(Joi.string().trim().lowercase()).optional(),
  prerequisites: Joi.array().items(objectId).optional(),
  thumbnailUrl: Joi.string().uri().allow('').optional(),
  level: Joi.string().valid('beginner', 'intermediate', 'advanced').optional(),
  price: Joi.number().min(0).optional(),
  language: Joi.string().valid(...COURSE_LANGUAGES).optional(),
});

const updateCourse = createCourse.fork(['title', 'category'], (s) => s.optional());

const createSection = Joi.object({
  title: Joi.string().trim().max(200).required(),
  order: Joi.number().integer().min(0).required(),
});

const reorderSections = Joi.object({
  order: Joi.array().items(objectId).required(),
});

const lessonBase = {
  title: Joi.string().trim().max(200).required(),
  section: objectId.required(),
  order: Joi.number().integer().min(0).required(),
  isPreview: Joi.boolean().optional(),
  prerequisiteLessons: Joi.array().items(objectId).optional(),
};

const createLesson = Joi.object({
  ...lessonBase,
  lessonType: Joi.string().valid('video', 'pdf', 'assignment', 'download', 'scorm').required(),
  videoUrl: Joi.string().uri().when('lessonType', { is: 'video', then: Joi.required() }),
  durationSeconds: Joi.number().when('lessonType', { is: 'video', then: Joi.required() }),
  captionsUrl: Joi.string().uri().allow('').optional(),
  fileUrl: Joi.string().uri().when('lessonType', {
    is: Joi.valid('pdf', 'download'),
    then: Joi.required(),
  }),
  pageCount: Joi.number().optional(),
  fileName: Joi.string().optional(),
  fileSizeBytes: Joi.number().optional(),
  instructions: Joi.string().max(5000).when('lessonType', { is: 'assignment', then: Joi.required() }),
  dueDate: Joi.date().optional(),
  maxScore: Joi.number().optional(),
  allowedFileTypes: Joi.array().items(Joi.string()).optional(),
  rubric: Joi.string().allow('').optional(),
  packageUrl: Joi.string().uri().when('lessonType', { is: 'scorm', then: Joi.required() }),
  entryPoint: Joi.string().when('lessonType', { is: 'scorm', then: Joi.required() }),
  scormVersion: Joi.string().valid('1.2').optional(),
});

const updateLesson = Joi.object({
  title: Joi.string().trim().max(200).optional(),
  order: Joi.number().integer().min(0).optional(),
  isPreview: Joi.boolean().optional(),
  prerequisiteLessons: Joi.array().items(objectId).optional(),

  videoUrl: Joi.string().uri().optional(),
  durationSeconds: Joi.number().optional(),
  captionsUrl: Joi.string().uri().allow('').optional(),
  fileUrl: Joi.string().uri().optional(),
  pageCount: Joi.number().optional(),
  fileName: Joi.string().optional(),
  fileSizeBytes: Joi.number().optional(),
  instructions: Joi.string().max(5000).optional(),
  dueDate: Joi.date().allow(null).optional(),
  maxScore: Joi.number().optional(),
  allowedFileTypes: Joi.array().items(Joi.string()).optional(),
  rubric: Joi.string().allow('').optional(),
  packageUrl: Joi.string().uri().optional(),
  entryPoint: Joi.string().optional(),
  scormVersion: Joi.string().valid('1.2').optional(),
}).min(1);

const publishCourse = Joi.object({
  status: Joi.string().valid('draft', 'published', 'archived').required(),
});

const setMentors = Joi.object({
  mentorIds: Joi.array().items(Joi.string().hex().length(24)).max(50).required(),
});

module.exports = {
  setMentors,
  createCourse,
  updateCourse,
  createSection,
  reorderSections,
  createLesson,
  updateLesson,
  publishCourse,
};
