const express = require('express');
const Joi = require('joi');
const catchAsync = require('../../utils/catchAsync');
const ApiResponse = require('../../utils/ApiResponse');
const requireAuth = require('../../middlewares/auth.middleware');
const validate = require('../../middlewares/validate.middleware');
const service = require('./reviews.service');

const router = express.Router();

const reviewSchema = Joi.object({
  rating: Joi.number().integer().min(1).max(5).required(),
  comment: Joi.string().max(2000).allow('').optional(),
});

const updateReviewSchema = Joi.object({
  rating: Joi.number().integer().min(1).max(5).optional(),
  comment: Joi.string().max(2000).allow('').optional(),
}).min(1);

router.get(
  '/courses/:courseId/reviews',
  catchAsync(async (req, res) => {
    const { page, limit } = req.query;
    const result = await service.listCourseReviews(req.params.courseId, {
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
    new ApiResponse(200, result.items, undefined, result.pagination).send(res);
  })
);

router.get(
  '/courses/:courseId/rating-summary',
  catchAsync(async (req, res) => {
    const summary = await service.getCourseRatingSummary(req.params.courseId);
    new ApiResponse(200, summary).send(res);
  })
);

router.use(requireAuth);

router.post(
  '/courses/:courseId/reviews',
  validate(reviewSchema),
  catchAsync(async (req, res) => {
    const review = await service.createReview(req.user.id, req.params.courseId, req.body);
    new ApiResponse(201, review, 'Review submitted').send(res);
  })
);

router.patch(
  '/:reviewId',
  validate(updateReviewSchema),
  catchAsync(async (req, res) => {
    const review = await service.updateReview(req.params.reviewId, req.user.id, req.body);
    new ApiResponse(200, review, 'Review updated').send(res);
  })
);

router.delete(
  '/:reviewId',
  catchAsync(async (req, res) => {
    await service.deleteReview(req.params.reviewId, req.user);
    new ApiResponse(200, null, 'Review deleted').send(res);
  })
);

module.exports = router;
