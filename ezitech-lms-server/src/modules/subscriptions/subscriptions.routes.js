const express = require('express');
const catchAsync = require('../../utils/catchAsync');
const ApiResponse = require('../../utils/ApiResponse');
const requireAuth = require('../../middlewares/auth.middleware');
const { authorize } = require('../../middlewares/rbac.middleware');
const validate = require('../../middlewares/validate.middleware');
const schemas = require('./subscriptions.validation');
const service = require('./subscriptions.service');

const router = express.Router();

router.get(
  '/plans',
  catchAsync(async (req, res) => {
    const plans = await service.listPlans();
    new ApiResponse(200, plans).send(res);
  })
);

router.use(requireAuth);

router.post(
  '/plans',
  authorize('admin'),
  validate(schemas.createPlan),
  catchAsync(async (req, res) => {
    const plan = await service.createPlan(req.body);
    new ApiResponse(201, plan, 'Plan created').send(res);
  })
);

router.patch(
  '/plans/:planId',
  authorize('admin'),
  validate(schemas.updatePlan),
  catchAsync(async (req, res) => {
    const plan = await service.updatePlan(req.params.planId, req.body);
    new ApiResponse(200, plan, 'Plan updated').send(res);
  })
);

router.get(
  '/me',
  catchAsync(async (req, res) => {
    const subscription = await service.getActiveSubscription(req.user.id);
    new ApiResponse(200, subscription).send(res);
  })
);

router.post(
  '/subscribe',
  catchAsync(async (req, res) => {
    const subscription = await service.subscribe(req.user.id, req.body.planId);
    new ApiResponse(201, subscription, 'Subscribed').send(res);
  })
);

router.patch(
  '/:subscriptionId/cancel',
  catchAsync(async (req, res) => {
    const subscription = await service.cancelSubscription(req.user.id, req.params.subscriptionId);
    new ApiResponse(200, subscription, 'Subscription cancelled').send(res);
  })
);

module.exports = router;
