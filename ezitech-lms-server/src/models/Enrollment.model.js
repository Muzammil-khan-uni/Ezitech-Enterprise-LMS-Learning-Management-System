const mongoose = require('mongoose');

const ENROLLMENT_STATUS = ['active', 'completed', 'dropped'];

const enrollmentSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
    learningPath: { type: mongoose.Schema.Types.ObjectId, ref: 'LearningPath', default: null },

    status: { type: String, enum: ENROLLMENT_STATUS, default: 'active' },
    progressPercent: { type: Number, default: 0, min: 0, max: 100 },

    pricePaid: { type: Number, default: 0, min: 0 },

    enrolledAt: { type: Date, default: Date.now },
    completedAt: Date,
    lastAccessedAt: Date,
  },
  { timestamps: true }
);

enrollmentSchema.index({ student: 1, course: 1 }, { unique: true });

module.exports = { Enrollment: mongoose.model('Enrollment', enrollmentSchema), ENROLLMENT_STATUS };
