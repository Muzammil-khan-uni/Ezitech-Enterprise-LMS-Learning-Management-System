const request = require('supertest');
const app = require('../src/app');
const env = require('../src/config/env');
const { Course } = require('../src/models/Course.model');
const { Enrollment } = require('../src/models/Enrollment.model');
const LearningPath = require('../src/models/LearningPath.model');
const SubscriptionPlan = require('../src/models/SubscriptionPlan.model');
const UserSubscription = require('../src/models/UserSubscription.model');
const { createUser, createCategory, authHeader, addMinimumContent } = require('./helpers/factories');

const api = (method, url, user) => {
  const req = request(app)[method](`/api/v1${url}`);
  return user ? req.set('Authorization', authHeader(user)) : req;
};

async function paidCourse(instructor, price = 25, { publish = true } = {}) {
  const category = await createCategory();
  const res = await api('post', '/courses', instructor).send({
    title: `Paid ${Date.now()}-${Math.random().toString(16).slice(2, 6)}`,
    category: category._id.toString(),
    price,
  });
  expect(res.status).toBe(201);
  const courseId = res.body.data._id;
  await addMinimumContent(courseId, instructor);
  if (publish) {
    const published = await api('patch', `/courses/${courseId}/status`, instructor).send({ status: 'published' });
    expect(published.status).toBe(200);
  }
  return courseId;
}

describe('Paid features are switched on without a payment gateway', () => {
  test('the switch is on by default and is reported to the client', async () => {
    expect(env.paymentsEnabled).toBe(true);
    const res = await api('get', '/config');
    expect(res.status).toBe(200);
    expect(res.body.data.paymentsEnabled).toBe(true);
  });

  test('instructors can create, price and publish a paid course', async () => {
    const { user: instructor } = await createUser({ role: 'instructor' });
    const category = await createCategory();

    const created = await api('post', '/courses', instructor).send({
      title: `Paid ${Date.now()}`,
      category: category._id.toString(),
      price: 19,
    });
    expect(created.status).toBe(201);
    expect(created.body.data.price).toBe(19);

    const repriced = await api('patch', `/courses/${created.body.data._id}`, instructor).send({ price: 30 });
    expect(repriced.status).toBe(200);
    expect(repriced.body.data.price).toBe(30);

    const courseId = await paidCourse(instructor);
    expect((await Course.findById(courseId)).status).toBe('published');
  });

  test('students can enroll in a paid course directly and through a learning path', async () => {
    const { user: instructor } = await createUser({ role: 'instructor' });
    const { user: student } = await createUser({ role: 'student' });
    const { user: other } = await createUser({ role: 'student' });
    const courseId = await paidCourse(instructor, 25);

    const direct = await api('post', '/enrollments', student).send({ courseId });
    expect(direct.status).toBe(201);
    expect(direct.body.data.pricePaid).toBe(25);

    const otherCourseId = await paidCourse(instructor, 40);
    const path = await LearningPath.create({
      title: 'Paid path',
      slug: `paid-path-${Date.now()}`,
      level: 'beginner',
      isPublished: true,
      createdBy: instructor._id,
      courses: [{ course: otherCourseId, order: 0 }],
    });
    const viaPath = await api('post', `/enrollments/learning-paths/${path._id}`, other);
    expect(viaPath.status).toBe(201);
    expect(await Enrollment.countDocuments({ student: other._id, pricePaid: 40 })).toBe(1);
  });

  test('subscriptions and coupons can be used', async () => {
    const { user: student } = await createUser({ role: 'student' });
    const { user: admin } = await createUser({ role: 'admin' });
    const { user: instructor } = await createUser({ role: 'instructor' });
    const plan = await SubscriptionPlan.create({ name: 'Pro', price: 10, durationDays: 30, isActive: true });

    const subscribe = await api('post', '/subscriptions/subscribe', student).send({ planId: plan._id.toString() });
    expect(subscribe.status).toBe(201);
    expect(await UserSubscription.countDocuments({ user: student._id })).toBe(1);

    const courseId = await paidCourse(instructor, 100);
    const coupon = await api('post', '/coupons', admin).send({ code: `OFF${Date.now()}`, discountType: 'percentage', discountValue: 10 });
    expect(coupon.status).toBe(201);
    const validate = await api('post', '/coupons/validate', student).send({ code: coupon.body.data.code, courseId });
    expect(validate.status).toBe(200);
    expect(validate.body.data.finalPrice).toBe(90);
  });

  test('revenue and earnings are reported from the recorded prices', async () => {
    const { user: instructor } = await createUser({ role: 'instructor' });
    const { user: student } = await createUser({ role: 'student' });
    const courseId = await paidCourse(instructor, 25);
    await api('post', '/enrollments', student).send({ courseId });

    const earnings = await api('get', '/analytics/instructor/earnings', instructor);
    expect(earnings.status).toBe(200);
    expect(earnings.body.data.paymentsEnabled).not.toBe(false);
    expect(earnings.body.data.totalGrossRevenue).toBe(25);
    expect(earnings.body.data.courses.length).toBeGreaterThan(0);

    const revenue = await require('../src/modules/analytics/analytics.service').getRevenueAnalytics();
    expect(revenue.paymentsEnabled).not.toBe(false);
    expect(revenue.totalRevenue).toBeGreaterThanOrEqual(25);
  });
});

describe('PAYMENTS_ENABLED=false still switches everything off', () => {
  beforeAll(() => {
    env.paymentsEnabled = false;
  });

  afterAll(() => {
    env.paymentsEnabled = true;
  });

  test('paid enrollment, subscriptions and priced courses are refused', async () => {
    const { user: instructor } = await createUser({ role: 'instructor' });
    const { user: student } = await createUser({ role: 'student' });
    const category = await createCategory();
    const plan = await SubscriptionPlan.create({ name: 'Off', price: 10, durationDays: 30, isActive: true });

    const created = await api('post', '/courses', instructor).send({
      title: `Off ${Date.now()}`,
      category: category._id.toString(),
      price: 19,
    });
    expect(created.status).toBe(400);

    const subscribe = await api('post', '/subscriptions/subscribe', student).send({ planId: plan._id.toString() });
    expect(subscribe.status).toBe(402);
    expect((await api('get', '/config')).body.data.paymentsEnabled).toBe(false);
  });
});
