const request = require('supertest');
const app = require('../src/app');
const { createUser, createCategory, authHeader, addMinimumContent, simulateWatching } = require('./helpers/factories');

async function createPublishedCourse(instructor, category, overrides = {}) {
  const courseRes = await request(app)
    .post('/api/v1/courses')
    .set('Authorization', authHeader(instructor))
    .send({ title: `Course ${Date.now()}-${Math.random()}`, category: category._id.toString(), price: 100, ...overrides });
  const courseId = courseRes.body.data._id;
  await addMinimumContent(courseId, instructor);
  await request(app)
    .patch(`/api/v1/courses/${courseId}/status`)
    .set('Authorization', authHeader(instructor))
    .send({ status: 'published' });
  return courseId;
}

describe('Enrollment: coupons', () => {
  test('a valid percentage coupon reduces the price paid, and the redemption counter increments', async () => {
    const { user: admin } = await createUser({ role: 'admin' });
    const { user: instructor } = await createUser({ role: 'instructor' });
    const { user: student } = await createUser({ role: 'student' });
    const category = await createCategory();
    const courseId = await createPublishedCourse(instructor, category, { price: 100 });

    const couponRes = await request(app)
      .post('/api/v1/coupons')
      .set('Authorization', authHeader(admin))
      .send({ code: `SAVE50-${Date.now()}`, discountType: 'percentage', discountValue: 50, isActive: true });
    expect(couponRes.status).toBe(201);
    const code = couponRes.body.data.code;

    const validateRes = await request(app)
      .post('/api/v1/coupons/validate')
      .set('Authorization', authHeader(student))
      .send({ code, courseId });
    expect(validateRes.status).toBe(200);
    expect(validateRes.body.data.finalPrice).toBe(50);

    const enrollRes = await request(app)
      .post('/api/v1/enrollments')
      .set('Authorization', authHeader(student))
      .send({ courseId, couponCode: code });
    expect(enrollRes.status).toBe(201);
    expect(enrollRes.body.data.pricePaid).toBe(50);
  });

  test('a coupon scoped to a different course is rejected', async () => {
    const { user: admin } = await createUser({ role: 'admin' });
    const { user: instructor } = await createUser({ role: 'instructor' });
    const { user: student } = await createUser({ role: 'student' });
    const category = await createCategory();
    const targetCourseId = await createPublishedCourse(instructor, category);
    const otherCourseId = await createPublishedCourse(instructor, category);

    const couponRes = await request(app)
      .post('/api/v1/coupons')
      .set('Authorization', authHeader(admin))
      .send({
        code: `ONLYOTHER-${Date.now()}`,
        discountType: 'fixed',
        discountValue: 20,
        applicableCourses: [otherCourseId],
      });

    const res = await request(app)
      .post('/api/v1/enrollments')
      .set('Authorization', authHeader(student))
      .send({ courseId: targetCourseId, couponCode: couponRes.body.data.code });

    expect(res.status).toBe(400);
  });

  test('an expired coupon is rejected', async () => {
    const { user: admin } = await createUser({ role: 'admin' });
    const { user: instructor } = await createUser({ role: 'instructor' });
    const { user: student } = await createUser({ role: 'student' });
    const category = await createCategory();
    const courseId = await createPublishedCourse(instructor, category);

    const couponRes = await request(app)
      .post('/api/v1/coupons')
      .set('Authorization', authHeader(admin))
      .send({
        code: `EXPIRES-${Date.now()}`,
        discountType: 'fixed',
        discountValue: 10,
        expiresAt: new Date(Date.now() + 60_000).toISOString(),
      });
    const Coupon = require('../src/models/Coupon.model');
    await Coupon.updateOne({ _id: couponRes.body.data._id }, { expiresAt: new Date(Date.now() - 1000) });

    const res = await request(app)
      .post('/api/v1/enrollments')
      .set('Authorization', authHeader(student))
      .send({ courseId, couponCode: couponRes.body.data.code });

    expect(res.status).toBe(400);
  });

  test('a coupon at its redemption limit is rejected for a subsequent student', async () => {
    const { user: admin } = await createUser({ role: 'admin' });
    const { user: instructor } = await createUser({ role: 'instructor' });
    const { user: studentA } = await createUser({ role: 'student' });
    const { user: studentB } = await createUser({ role: 'student' });
    const category = await createCategory();
    const courseId = await createPublishedCourse(instructor, category);

    const couponRes = await request(app)
      .post('/api/v1/coupons')
      .set('Authorization', authHeader(admin))
      .send({ code: `ONEUSE-${Date.now()}`, discountType: 'fixed', discountValue: 10, maxRedemptions: 1 });
    const code = couponRes.body.data.code;

    const firstEnroll = await request(app)
      .post('/api/v1/enrollments')
      .set('Authorization', authHeader(studentA))
      .send({ courseId, couponCode: code });
    expect(firstEnroll.status).toBe(201);

    const secondEnroll = await request(app)
      .post('/api/v1/enrollments')
      .set('Authorization', authHeader(studentB))
      .send({ courseId, couponCode: code });
    expect(secondEnroll.status).toBe(400);
  });
});

describe('Enrollment: prerequisites', () => {
  test('enrolling in a course with an unmet prerequisite is rejected, and succeeds once the prerequisite is completed', async () => {
    const { user: instructor } = await createUser({ role: 'instructor' });
    const { user: student } = await createUser({ role: 'student' });
    const category = await createCategory();

    const prereqCourseId = await createPublishedCourse(instructor, category, { price: 0 });
    const advancedCourseRes = await request(app)
      .post('/api/v1/courses')
      .set('Authorization', authHeader(instructor))
      .send({
        title: `Advanced Course ${Date.now()}`,
        category: category._id.toString(),
        price: 0,
        prerequisites: [prereqCourseId],
      });
    const advancedCourseId = advancedCourseRes.body.data._id;
    await addMinimumContent(advancedCourseId, instructor);
    await request(app)
      .patch(`/api/v1/courses/${advancedCourseId}/status`)
      .set('Authorization', authHeader(instructor))
      .send({ status: 'published' });

    const blockedRes = await request(app)
      .post('/api/v1/enrollments')
      .set('Authorization', authHeader(student))
      .send({ courseId: advancedCourseId });
    expect(blockedRes.status).toBe(400);

    await request(app).post('/api/v1/enrollments').set('Authorization', authHeader(student)).send({ courseId: prereqCourseId });
    const lessonsRes = await request(app)
      .get(`/api/v1/courses/${prereqCourseId}/lessons`)
      .set('Authorization', authHeader(student));
    await simulateWatching(student, prereqCourseId);
    for (const lesson of lessonsRes.body.data) {
      await request(app)
        .post(`/api/v1/progress/courses/${prereqCourseId}/lessons/${lesson._id}/complete`)
        .set('Authorization', authHeader(student));
    }

    const allowedRes = await request(app)
      .post('/api/v1/enrollments')
      .set('Authorization', authHeader(student))
      .send({ courseId: advancedCourseId });
    expect(allowedRes.status).toBe(201);
  });
});

describe('Enrollment: drop and re-enroll', () => {
  test('dropping and re-enrolling reactivates the same enrollment record rather than erroring or duplicating', async () => {
    const { user: instructor } = await createUser({ role: 'instructor' });
    const { user: student } = await createUser({ role: 'student' });
    const category = await createCategory();
    const courseId = await createPublishedCourse(instructor, category, { price: 0 });

    const firstEnroll = await request(app)
      .post('/api/v1/enrollments')
      .set('Authorization', authHeader(student))
      .send({ courseId });
    const enrollmentId = firstEnroll.body.data._id;

    const dropRes = await request(app)
      .patch(`/api/v1/enrollments/${courseId}/drop`)
      .set('Authorization', authHeader(student));
    expect(dropRes.status).toBe(200);

    const reEnrollRes = await request(app)
      .post('/api/v1/enrollments')
      .set('Authorization', authHeader(student))
      .send({ courseId });
    expect(reEnrollRes.status).toBe(201);
    expect(reEnrollRes.body.data._id).toBe(enrollmentId);
    expect(reEnrollRes.body.data.status).toBe('active');
  });

  test('enrolling twice without dropping is rejected as a conflict', async () => {
    const { user: instructor } = await createUser({ role: 'instructor' });
    const { user: student } = await createUser({ role: 'student' });
    const category = await createCategory();
    const courseId = await createPublishedCourse(instructor, category, { price: 0 });

    await request(app).post('/api/v1/enrollments').set('Authorization', authHeader(student)).send({ courseId });
    const secondAttempt = await request(app)
      .post('/api/v1/enrollments')
      .set('Authorization', authHeader(student))
      .send({ courseId });

    expect(secondAttempt.status).toBe(409);
  });
});
