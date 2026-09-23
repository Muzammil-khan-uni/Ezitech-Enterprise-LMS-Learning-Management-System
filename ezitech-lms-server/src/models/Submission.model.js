const mongoose = require('mongoose');

const SUBMISSION_STATUS = ['in_progress', 'submitted', 'auto_graded', 'graded'];

const submissionSchema = new mongoose.Schema(
  {
    assessment: { type: mongoose.Schema.Types.ObjectId, ref: 'Assessment', required: true, index: true },
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    attemptNumber: { type: Number, required: true, default: 1 },

    status: { type: String, enum: SUBMISSION_STATUS, default: 'in_progress' },

    startedAt: { type: Date, default: Date.now },
    submittedAt: Date,
    timeTakenSeconds: Number,

    quizAnswers: [
      {
        questionId: { type: mongoose.Schema.Types.ObjectId, required: true },
        selectedOptionIndexes: [Number],
      },
    ],

    code: String,
    language: String,

    fileUrl: String,

    score: Number,
    maxScore: Number,
    passed: Boolean,
    feedback: { type: String, maxlength: 3000 },
    gradedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    gradedAt: Date,
  },
  { timestamps: true }
);

submissionSchema.index({ assessment: 1, student: 1, attemptNumber: 1 }, { unique: true });

submissionSchema.index({ assessment: 1, status: 1 });

module.exports = { Submission: mongoose.model('Submission', submissionSchema), SUBMISSION_STATUS };
