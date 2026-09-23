const express = require('express');
const catchAsync = require('../../utils/catchAsync');
const ApiResponse = require('../../utils/ApiResponse');
const ApiError = require('../../utils/ApiError');
const requireAuth = require('../../middlewares/auth.middleware');
const { authorize } = require('../../middlewares/rbac.middleware');
const validate = require('../../middlewares/validate.middleware');
const { Course } = require('../../models/Course.model');
const schemas = require('./coupons.validation');
const service = require('./coupons.service');
const { assertPaymentsEnabled } = require('../../utils/payments');

const router = express.Router();

router.use(requireAuth);

router.post(
  '/',
  authorize('admin', 'course_manager'),
  validate(schemas.createCoupon),
  catchAsync(async (req, res) => {
    const coupon = await service.createCoupon(req.body, req.user.id);
    new ApiResponse(201, coupon, 'Coupon created').send(res);
  })
);

router.get(
  '/',
  authorize('admin', 'course_manager'),
  catchAsync(async (req, res) => {
    const coupons = await service.listCoupons();
    new ApiResponse(200, coupons).send(res);
  })
);

router.delete(
  '/:couponId',
  authorize('admin', 'course_manager'),
  catchAsync(async (req, res) => {
    await service.deleteCoupon(req.params.couponId);
    new ApiResponse(200, null, 'Coupon deleted').send(res);
  })
);

router.post(
  '/validate',
  validate(schemas.validateCoupon),
  catchAsync(async (req, res) => {
    const { code, courseId } = req.body;
    assertPaymentsEnabled('Coupons cannot be used while paid courses are switched off');

    const course = await Course.findById(courseId).select('price');
    if (!course) throw ApiError.notFound('Course not found');

    const { finalPrice } = await service.applyCoupon(code, course.price, courseId);
    new ApiResponse(200, { originalPrice: course.price, finalPrice }).send(res);
  })
);

module.exports = router;
