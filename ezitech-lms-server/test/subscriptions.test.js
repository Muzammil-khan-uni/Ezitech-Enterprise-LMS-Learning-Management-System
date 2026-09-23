const request = require('supertest');
const app = require('../src/app');
const { createUser, createCategory, authHeader, addMinimumContent } = require('./helpers/factories');

async function createPlan(admin, overrides = {}) {
  const res = await request(app)
    .post('/api/v1/subscriptions/plans')
    .set('Authorization', authHeader(admin))
    .send({ name: `Plan ${Date.now()}-${Math.random()}`, price: 29, durationDays: 30, coursesIncluded: 'all', ...overrides });
  return res.body.data;
}

async function createPublishedCourse(instructor, category, price = 100) {
  const courseRes = await request(app)
    .post('/api/v1/courses')
    .set('Authorization', authHeader(instructor))
    .send({ title: `Course ${Date.now()}-${Math.random()}`, category: category._id.toString(), price });
  const courseId = courseRes.body.data._id;
  await addMinimumContent(courseId, instructor);
  await request(app)
    .patch(`/api/v1/courses/${courseId}/status`)
    .set('Authorization', authHeader(instructor))
    .send({ status: 'published' });
  return courseId;
}

describe('Subscriptions: lifecycle', () => {
  test('subscribing activates immediately and appears as the current subscription', async () => {
    const { user: admin } = await createUser({ role: 'admin' });
    const { user: student } = await createUser({ role: 'student' });
    const plan = await createPlan(admin);

    const subscribeRes = await request(app)
      .post('/api/v1/subscriptions/subscribe')
      .set('Authorization', authHeader(student))
      .send({ planId: plan._id });
    expect(subscribeRes.status).toBe(201);

    const meRes = await request(app).get('/api/v1/subscriptions/me').set('Authorization', authHeader(student));
    expect(meRes.status).toBe(200);
    expect(meRes.body.data).not.toBeNull();
  });

  test('cancelling a subscription means it no longer shows as active', async () => {
    const { user: admin } = await createUser({ role: 'admin' });
    const { user: student } = await createUser({ role: 'student' });
    const plan = await createPlan(admin);

    const subscribeRes = await request(app)
      .post('/api/v1/subscriptions/subscribe')
      .set('Authorization', authHeader(student))
      .send({ planId: plan._id });
    const subscriptionId = subscribeRes.body.data._id;

    const cancelRes = await request(app)
      .patch(`/api/v1/subscriptions/${subscriptionId}/cancel`)
      .set('Authorization', authHeader(student));
    expect(cancelRes.status).toBe(200);

    const meRes = await request(app).get('/api/v1/subscriptions/me').set('Authorization', authHeader(student));
    expect(meRes.body.data).toBeNull();
  });

  test('re-subscribing to the same plan before it expires extends from the current expiry, not from now', async () => {
    const { user: admin } = await createUser({ role: 'admin' });
    const { user: student } = await createUser({ role: 'student' });
    const plan = await createPlan(admin, { durationDays: 30 });

    const first = await request(app)
      .post('/api/v1/subscriptions/subscribe')
      .set('Authorization', authHeader(student))
      .send({ planId: plan._id });
    const firstExpiry = new Date(first.body.data.expiresAt).getTime();

    const second = await request(app)
      .post('/api/v1/subscriptions/subscribe')
      .set('Authorization', authHeader(student))
      .send({ planId: plan._id });
    const secondExpiry = new Date(second.body.data.expiresAt).getTime();

    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
    expect(secondExpiry - firstExpiry).toBeGreaterThan(thirtyDaysMs - 5000);
    expect(secondExpiry - firstExpiry).toBeLessThan(thirtyDaysMs + 5000);
  });
});

describe('Subscriptions: course coverage', () => {
  test('an "all courses" plan covers every course - enrolling in a paid course while subscribed costs nothing', async () => {
    const { user: admin } = await createUser({ role: 'admin' });
    const { user: instructor } = await createUser({ role: 'instructor' });
    const { user: student } = await createUser({ role: 'student' });
    const category = await createCategory();
    const courseId = await createPublishedCourse(instructor, category, 100);
    const plan = await createPlan(admin, { coursesIncluded: 'all' });

    await request(app)
      .post('/api/v1/subscriptions/subscribe')
      .set('Authorization', authHeader(student))
      .send({ planId: plan._id });

    const enrollRes = await request(app)
      .post('/api/v1/enrollments')
      .set('Authorization', authHeader(student))
      .send({ courseId });

    expect(enrollRes.status).toBe(201);
    expect(enrollRes.body.data.pricePaid).toBe(0);
  });

  test('a plan scoped to specific courses does NOT cover a course outside that list - full price is still charged', async () => {
    const { user: admin } = await createUser({ role: 'admin' });
    const { user: instructor } = await createUser({ role: 'instructor' });
    const { user: student } = await createUser({ role: 'student' });
    const category = await createCategory();
    const coveredCourseId = await createPublishedCourse(instructor, category, 100);
    const uncoveredCourseId = await createPublishedCourse(instructor, category, 100);
    const plan = await createPlan(admin, { coursesIncluded: [coveredCourseId] });

    await request(app)
      .post('/api/v1/subscriptions/subscribe')
      .set('Authorization', authHeader(student))
      .send({ planId: plan._id });

    const coveredEnroll = await request(app)
      .post('/api/v1/enrollments')
      .set('Authorization', authHeader(student))
      .send({ courseId: coveredCourseId });
    expect(coveredEnroll.body.data.pricePaid).toBe(0);

    const uncoveredEnroll = await request(app)
      .post('/api/v1/enrollments')
      .set('Authorization', authHeader(student))
      .send({ courseId: uncoveredCourseId });
    expect(uncoveredEnroll.body.data.pricePaid).toBe(100);
  });

  test('a free course does not require a subscription at all', async () => {
    const { user: instructor } = await createUser({ role: 'instructor' });
    const { user: student } = await createUser({ role: 'student' });
    const category = await createCategory();
    const freeCourseId = await createPublishedCourse(instructor, category, 0);

    const res = await request(app)
      .post('/api/v1/enrollments')
      .set('Authorization', authHeader(student))
      .send({ courseId: freeCourseId });

    expect(res.status).toBe(201);
    expect(res.body.data.pricePaid).toBe(0);
  });
});
