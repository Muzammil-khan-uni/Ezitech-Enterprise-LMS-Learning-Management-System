const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    discountType: { type: String, enum: ['percentage', 'fixed'], required: true },
    discountValue: { type: Number, required: true, min: 0 },

    applicableCourses: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Course' }],

    maxRedemptions: { type: Number, default: null },
    redeemedCount: { type: Number, default: 0 },

    expiresAt: Date,
    isActive: { type: Boolean, default: true },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Coupon', couponSchema);
