const Joi = require('joi');

const objectId = Joi.string().hex().length(24);

const optionSchema = Joi.object({
  text: Joi.string().required(),
  isCorrect: Joi.boolean().required(),
});

const questionSchema = Joi.object({
  questionText: Joi.string().max(1000).required(),
  type: Joi.string().valid('mcq', 'multi_select', 'true_false').default('mcq'),
  options: Joi.array().items(optionSchema).min(2).required(),
  points: Joi.number().min(0).default(1),
});

const createAssessment = Joi.object({
  course: objectId.required(),
  lesson: objectId.optional(),
  title: Joi.string().trim().max(200).required(),
  description: Joi.string().max(3000).allow('').optional(),
  assessmentType: Joi.string().valid('quiz', 'coding_assignment', 'project').required(),
  evaluationType: Joi.string().valid('auto', 'manual', 'hybrid').required(),
  maxAttempts: Joi.number().integer().min(1).optional(),
  dueDate: Joi.date().optional(),
  isPublished: Joi.boolean().optional(),

  questions: Joi.array().items(questionSchema).when('assessmentType', { is: 'quiz', then: Joi.required() }),
  timeLimitMinutes: Joi.number().integer().min(1).allow(null).optional(),
  passingScorePercent: Joi.number().min(0).max(100).optional(),
  shuffleQuestions: Joi.boolean().optional(),

  instructions: Joi.string()
    .max(5000)
    .when('assessmentType', { is: Joi.valid('coding_assignment', 'project'), then: Joi.required() }),
  allowedLanguages: Joi.array().items(Joi.string()).optional(),
  starterCode: Joi.string().allow('').optional(),

  allowedFileTypes: Joi.array().items(Joi.string()).optional(),
  rubric: Joi.string().allow('').optional(),

  maxScore: Joi.number().min(1).optional(),
});

const updateAssessment = Joi.object({
  lesson: objectId.allow(null).optional(),
  title: Joi.string().trim().max(200).optional(),
  description: Joi.string().max(3000).allow('').optional(),
  evaluationType: Joi.string().valid('auto', 'manual', 'hybrid').optional(),
  maxAttempts: Joi.number().integer().min(1).optional(),
  dueDate: Joi.date().allow(null).optional(),
  isPublished: Joi.boolean().optional(),

  questions: Joi.array().items(questionSchema).min(1).optional(),
  timeLimitMinutes: Joi.number().integer().min(1).allow(null).optional(),
  passingScorePercent: Joi.number().min(0).max(100).optional(),
  shuffleQuestions: Joi.boolean().optional(),

  instructions: Joi.string().max(5000).optional(),
  allowedLanguages: Joi.array().items(Joi.string()).optional(),
  starterCode: Joi.string().allow('').optional(),
  allowedFileTypes: Joi.array().items(Joi.string()).optional(),
  rubric: Joi.string().allow('').optional(),

  maxScore: Joi.number().min(1).optional(),
}).min(1);

const submitAttempt = Joi.object({
  quizAnswers: Joi.array()
    .items(
      Joi.object({
        questionId: objectId.required(),
        selectedOptionIndexes: Joi.array().items(Joi.number().integer().min(0)).required(),
      })
    )
    .optional(),
  code: Joi.string().optional(),
  language: Joi.string().optional(),
  fileUrl: Joi.string().uri().optional(),
});

const gradeSubmission = Joi.object({
  score: Joi.number().min(0).required(),
  feedback: Joi.string().max(3000).allow('').optional(),
});

module.exports = { createAssessment, updateAssessment, submitAttempt, gradeSubmission };
