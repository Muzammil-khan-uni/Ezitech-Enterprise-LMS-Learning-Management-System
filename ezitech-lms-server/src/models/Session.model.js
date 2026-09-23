const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    refreshTokenHash: {
      type: String,
      required: true,
    },
    deviceInfo: {
      userAgent: String,
      ip: String,
      label: String,
    },
    previousRefreshTokenHash: String,
    previousRotatedAt: Date,
    lastActiveAt: {
      type: Date,
      default: Date.now,
    },
    isRevoked: {
      type: Boolean,
      default: false,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
  },
  { timestamps: true }
);

sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const Session = mongoose.model('Session', sessionSchema);

module.exports = Session;
