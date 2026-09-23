const mongoose = require('mongoose');

const progressSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
    lesson: { type: mongoose.Schema.Types.ObjectId, ref: 'Lesson', required: true },
    section: { type: mongoose.Schema.Types.ObjectId, ref: 'Section', required: true },

    isCompleted: { type: Boolean, default: false },
    completedAt: Date,

    timeSpentSeconds: { type: Number, default: 0 },
    lastPositionSeconds: { type: Number, default: 0 },
    watchedSeconds: { type: Number, default: 0 },
    lastReportAt: Date,
  },
  { timestamps: true }
);

progressSchema.index({ student: 1, lesson: 1 }, { unique: true });
progressSchema.index({ student: 1, course: 1 });

module.exports = mongoose.model('Progress', progressSchema);
