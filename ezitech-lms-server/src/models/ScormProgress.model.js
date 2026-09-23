const mongoose = require('mongoose');

const scormProgressSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    lesson: { type: mongoose.Schema.Types.ObjectId, ref: 'Lesson', required: true },
    course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },

    lessonStatus: {
      type: String,
      enum: ['passed', 'completed', 'failed', 'incomplete', 'browsed', 'not attempted'],
      default: 'not attempted',
    },
    scoreRaw: Number,
    lessonLocation: String,
    suspendData: String,
    sessionTime: String,

    lastCommittedAt: Date,
  },
  { timestamps: true }
);

scormProgressSchema.index({ student: 1, lesson: 1 }, { unique: true });

module.exports = mongoose.model('ScormProgress', scormProgressSchema);
