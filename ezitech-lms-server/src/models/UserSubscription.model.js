const mongoose = require('mongoose');

const userSubscriptionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    plan: { type: mongoose.Schema.Types.ObjectId, ref: 'SubscriptionPlan', required: true },
    pricePaid: { type: Number, required: true, min: 0 },
    startedAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, required: true },
    cancelledAt: Date,
  },
  { timestamps: true }
);

userSubscriptionSchema.index({ user: 1, expiresAt: -1 });

module.exports = mongoose.model('UserSubscription', userSubscriptionSchema);
