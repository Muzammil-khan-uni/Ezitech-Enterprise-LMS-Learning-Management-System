const mongoose = require('mongoose');
const crypto = require('crypto');

const LIVE_SESSION_STATUS = ['scheduled', 'live', 'ended', 'cancelled'];

const liveSessionSchema = new mongoose.Schema(
  {
    course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
    instructor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, maxlength: 2000 },

    scheduledAt: { type: Date, required: true },
    startedAt: Date,
    endedAt: Date,
    status: { type: String, enum: LIVE_SESSION_STATUS, default: 'scheduled' },

    roomId: { type: String, required: true, unique: true, default: () => crypto.randomBytes(12).toString('hex') },
  },
  { timestamps: true }
);

liveSessionSchema.index({ course: 1, scheduledAt: -1 });

module.exports = { LiveSession: mongoose.model('LiveSession', liveSessionSchema), LIVE_SESSION_STATUS };
