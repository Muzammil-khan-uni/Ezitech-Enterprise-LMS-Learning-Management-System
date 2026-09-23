const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    liveSession: { type: mongoose.Schema.Types.ObjectId, ref: 'LiveSession', required: true },
    course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },

    joinedAt: { type: Date, required: true },
    leftAt: Date,
    currentSegmentStartedAt: Date,
    durationSeconds: { type: Number, default: 0 },
    isPresent: { type: Boolean, default: true },
  },
  { timestamps: true }
);

attendanceSchema.index({ student: 1, liveSession: 1 }, { unique: true });
attendanceSchema.index({ liveSession: 1 });

module.exports = mongoose.model('Attendance', attendanceSchema);
