const mongoose = require('mongoose');

const subscriptionPlanSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: String,
    price: { type: Number, required: true, min: 0 },
    durationDays: { type: Number, required: true, min: 1 },

    coursesIncluded: {
      type: mongoose.Schema.Types.Mixed,
      default: 'all',
    },

    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('SubscriptionPlan', subscriptionPlanSchema);
