const Coupon = require('../../models/Coupon.model');
const ApiError = require('../../utils/ApiError');

async function createCoupon(data, creatorId) {
  const existing = await Coupon.findOne({ code: data.code.toUpperCase() });
  if (existing) throw ApiError.conflict('A coupon with this code already exists');
  return Coupon.create({ ...data, createdBy: creatorId });
}

async function listCoupons() {
  return Coupon.find().sort('-createdAt');
}

async function deleteCoupon(couponId) {
  const result = await Coupon.deleteOne({ _id: couponId });
  if (result.deletedCount === 0) throw ApiError.notFound('Coupon not found');
}

async function applyCoupon(code, coursePrice, courseId) {
  const coupon = await Coupon.findOne({ code: code.toUpperCase() });
  if (!coupon || !coupon.isActive) throw ApiError.badRequest('Invalid coupon code');

  if (coupon.expiresAt && coupon.expiresAt < new Date()) {
    throw ApiError.badRequest('This coupon has expired');
  }
  if (coupon.maxRedemptions !== null && coupon.redeemedCount >= coupon.maxRedemptions) {
    throw ApiError.badRequest('This coupon has reached its redemption limit');
  }
  if (
    coupon.applicableCourses.length > 0 &&
    !coupon.applicableCourses.some((id) => id.toString() === courseId.toString())
  ) {
    throw ApiError.badRequest('This coupon is not valid for this course');
  }

  const discount =
    coupon.discountType === 'percentage' ? (coursePrice * coupon.discountValue) / 100 : coupon.discountValue;

  const finalPrice = Math.max(0, Math.round((coursePrice - discount) * 100) / 100);
  return { coupon, finalPrice };
}

async function reserveRedemption(coupon) {
  const filter = { _id: coupon._id };
  if (coupon.maxRedemptions !== null && coupon.maxRedemptions !== undefined) {
    filter.redeemedCount = { $lt: coupon.maxRedemptions };
  }
  const result = await Coupon.updateOne(filter, { $inc: { redeemedCount: 1 } });
  if (result.modifiedCount !== 1) {
    throw ApiError.badRequest('This coupon has reached its redemption limit');
  }
}

async function releaseRedemption(couponId) {
  await Coupon.updateOne({ _id: couponId, redeemedCount: { $gt: 0 } }, { $inc: { redeemedCount: -1 } });
}

module.exports = { createCoupon, listCoupons, deleteCoupon, applyCoupon, reserveRedemption, releaseRedemption };
