const mongoose = require('mongoose');

const ASSESSMENT_TYPES = ['quiz', 'coding_assignment', 'project'];

const baseOptions = { discriminatorKey: 'assessmentType', timestamps: true };

const assessmentSchema = new mongoose.Schema(
  {
    course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
    lesson: { type: mongoose.Schema.Types.ObjectId, ref: 'Lesson', default: null },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, maxlength: 3000 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    maxAttempts: { type: Number, default: 1, min: 1 },
    dueDate: Date,
    isPublished: { type: Boolean, default: false },

    evaluationType: {
      type: String,
      enum: ['auto', 'manual', 'hybrid'],
      required: true,
    },
  },
  baseOptions
);

const Assessment = mongoose.model('Assessment', assessmentSchema);

const questionSchema = new mongoose.Schema(
  {
    questionText: { type: String, required: true, maxlength: 1000 },
    type: { type: String, enum: ['mcq', 'multi_select', 'true_false'], default: 'mcq' },
    options: [
      {
        text: { type: String, required: true },
        isCorrect: { type: Boolean, default: false },
      },
    ],
    points: { type: Number, default: 1, min: 0 },
  },
  { _id: true }
);

const Quiz = Assessment.discriminator(
  'quiz',
  new mongoose.Schema({
    questions: { type: [questionSchema], validate: (v) => v.length > 0 },
    timeLimitMinutes: { type: Number, default: null },
    passingScorePercent: { type: Number, default: 60, min: 0, max: 100 },
    shuffleQuestions: { type: Boolean, default: false },
  })
);

const CodingAssignment = Assessment.discriminator(
  'coding_assignment',
  new mongoose.Schema({
    instructions: { type: String, required: true, maxlength: 5000 },
    allowedLanguages: [String],
    starterCode: String,
    maxScore: { type: Number, default: 100 },
  })
);

const Project = Assessment.discriminator(
  'project',
  new mongoose.Schema({
    instructions: { type: String, required: true, maxlength: 5000 },
    allowedFileTypes: [String],
    maxScore: { type: Number, default: 100 },
    rubric: String,
  })
);

module.exports = { Assessment, Quiz, CodingAssignment, Project, ASSESSMENT_TYPES };
