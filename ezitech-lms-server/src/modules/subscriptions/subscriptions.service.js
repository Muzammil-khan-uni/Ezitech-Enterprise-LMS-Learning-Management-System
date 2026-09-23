const SubscriptionPlan = require('../../models/SubscriptionPlan.model');
const UserSubscription = require('../../models/UserSubscription.model');
const ApiError = require('../../utils/ApiError');
const { assertPaymentsEnabled } = require('../../utils/payments');

async function createPlan(data) {
  return SubscriptionPlan.create(data);
}

async function listPlans() {
  return SubscriptionPlan.find({ isActive: true }).sort('price');
}

async function updatePlan(planId, updates) {
  const plan = await SubscriptionPlan.findByIdAndUpdate(planId, updates, { new: true, runValidators: true });
  if (!plan) throw ApiError.notFound('Plan not found');
  return plan;
}

async function subscribe(userId, planId) {
  assertPaymentsEnabled('Subscriptions are not available yet');

  const plan = await SubscriptionPlan.findById(planId);
  if (!plan || !plan.isActive) throw ApiError.notFound('Plan not found');

  const existing = await getActiveSubscription(userId);
  const isSamePlan = existing && existing.plan._id.toString() === planId;
  const startBase = isSamePlan ? existing.expiresAt : new Date();
  const expiresAt = new Date(startBase.getTime() + plan.durationDays * 24 * 60 * 60 * 1000);

  return UserSubscription.create({ user: userId, plan: planId, expiresAt, pricePaid: plan.price });
}

async function getActiveSubscription(userId) {
  return UserSubscription.findOne({
    user: userId,
    expiresAt: { $gt: new Date() },
    cancelledAt: { $exists: false },
  })
    .sort('-expiresAt')
    .populate('plan');
}

async function cancelSubscription(userId, subscriptionId) {
  const subscription = await UserSubscription.findOne({ _id: subscriptionId, user: userId });
  if (!subscription) throw ApiError.notFound('Subscription not found');
  subscription.cancelledAt = new Date();
  await subscription.save();
  return subscription;
}

function subscriptionCoversCourse(subscription, courseId) {
  if (!subscription) return false;
  const { coursesIncluded } = subscription.plan;
  if (coursesIncluded === 'all') return true;
  if (Array.isArray(coursesIncluded)) {
    return coursesIncluded.some((id) => id.toString() === courseId.toString());
  }
  return false;
}

module.exports = {
  createPlan,
  listPlans,
  updatePlan,
  subscribe,
  getActiveSubscription,
  cancelSubscription,
  subscriptionCoversCourse,
};
