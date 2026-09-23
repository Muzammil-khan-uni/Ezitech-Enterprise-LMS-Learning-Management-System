const request = require('supertest');
const app = require('../src/app');
const { createUser, createCategory, authHeader, addMinimumContent } = require('./helpers/factories');

async function createPublishedCourse(owner) {
  const category = await createCategory();
  const courseRes = await request(app)
    .post('/api/v1/courses')
    .set('Authorization', authHeader(owner))
    .send({ title: `Course ${Date.now()}`, category: category._id.toString() });
  const courseId = courseRes.body.data._id;
  await addMinimumContent(courseId, owner);
  await request(app)
    .patch(`/api/v1/courses/${courseId}/status`)
    .set('Authorization', authHeader(owner))
    .send({ status: 'published' });
  return courseId;
}

describe('RBAC: discussion board enrollment gating', () => {
  test('a student who is not enrolled cannot list threads or post to the board', async () => {
    const { user: instructor } = await createUser({ role: 'instructor' });
    const { user: outsider } = await createUser({ role: 'student' });
    const courseId = await createPublishedCourse(instructor);

    const listRes = await request(app)
      .get(`/api/v1/discussions/courses/${courseId}/threads`)
      .set('Authorization', authHeader(outsider));
    expect(listRes.status).toBe(403);

    const postRes = await request(app)
      .post(`/api/v1/discussions/courses/${courseId}/threads`)
      .set('Authorization', authHeader(outsider))
      .send({ title: 'Can I ask something?', body: 'Testing unauthorized post.' });
    expect(postRes.status).toBe(403);
  });

  test('an enrolled student can post a thread and read it back, and the instructor can reply', async () => {
    const { user: instructor } = await createUser({ role: 'instructor' });
    const { user: student } = await createUser({ role: 'student' });
    const courseId = await createPublishedCourse(instructor);
    await request(app).post('/api/v1/enrollments').set('Authorization', authHeader(student)).send({ courseId });

    const threadRes = await request(app)
      .post(`/api/v1/discussions/courses/${courseId}/threads`)
      .set('Authorization', authHeader(student))
      .send({ title: 'A question', body: 'How does this work?' });
    expect(threadRes.status).toBe(201);
    const threadId = threadRes.body.data._id;

    const getRes = await request(app)
      .get(`/api/v1/discussions/threads/${threadId}`)
      .set('Authorization', authHeader(student));
    expect(getRes.status).toBe(200);

    const replyRes = await request(app)
      .post(`/api/v1/discussions/threads/${threadId}/comments`)
      .set('Authorization', authHeader(instructor))
      .send({ body: 'Great question - here is the answer.' });
    expect(replyRes.status).toBe(201);
    expect(replyRes.body.data.isInstructorReply).toBe(true);
  });

  test('a student cannot post an announcement, even when enrolled', async () => {
    const { user: instructor } = await createUser({ role: 'instructor' });
    const { user: student } = await createUser({ role: 'student' });
    const courseId = await createPublishedCourse(instructor);
    await request(app).post('/api/v1/enrollments').set('Authorization', authHeader(student)).send({ courseId });

    const res = await request(app)
      .post(`/api/v1/discussions/courses/${courseId}/threads`)
      .set('Authorization', authHeader(student))
      .send({ title: 'Fake announcement', body: 'Not really allowed', isAnnouncement: true });

    expect(res.status).toBe(403);
  });

  test('an unrelated instructor (not enrolled, not the owner) cannot access another instructor\'s course board, but staff roles can', async () => {
    const { user: instructorA } = await createUser({ role: 'instructor' });
    const { user: instructorB } = await createUser({ role: 'instructor' });
    const { user: admin } = await createUser({ role: 'admin' });
    const courseId = await createPublishedCourse(instructorA);

    const blockedRes = await request(app)
      .get(`/api/v1/discussions/courses/${courseId}/threads`)
      .set('Authorization', authHeader(instructorB));
    expect(blockedRes.status).toBe(403);

    const adminRes = await request(app)
      .get(`/api/v1/discussions/courses/${courseId}/threads`)
      .set('Authorization', authHeader(admin));
    expect(adminRes.status).toBe(200);
  });
});
