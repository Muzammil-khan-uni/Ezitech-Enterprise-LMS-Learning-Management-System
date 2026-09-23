const request = require('supertest');
const app = require('../src/app');
const { createUser, authHeader } = require('./helpers/factories');

describe('RBAC: learning path publication gating', () => {
  test('a draft learning path is invisible to an anonymous visitor and a student, but visible to a course_manager', async () => {
    const { user: manager } = await createUser({ role: 'course_manager' });
    const { user: student } = await createUser({ role: 'student' });

    const createRes = await request(app)
      .post('/api/v1/learning-paths')
      .set('Authorization', authHeader(manager))
      .send({ title: `Draft Roadmap ${Date.now()}`, level: 'beginner' });
    expect(createRes.status).toBe(201);
    const pathId = createRes.body.data._id;

    const anonRes = await request(app).get(`/api/v1/learning-paths/${pathId}`);
    expect(anonRes.status).toBe(404);

    const studentRes = await request(app)
      .get(`/api/v1/learning-paths/${pathId}`)
      .set('Authorization', authHeader(student));
    expect(studentRes.status).toBe(404);

    const managerRes = await request(app)
      .get(`/api/v1/learning-paths/${pathId}`)
      .set('Authorization', authHeader(manager));
    expect(managerRes.status).toBe(200);
  });

  test('the list endpoint excludes drafts for anonymous/student callers regardless of an isPublished=false query override, but a manager can request drafts explicitly', async () => {
    const { user: manager } = await createUser({ role: 'course_manager' });
    const { user: student } = await createUser({ role: 'student' });

    const draftRes = await request(app)
      .post('/api/v1/learning-paths')
      .set('Authorization', authHeader(manager))
      .send({ title: `Sneaky Draft ${Date.now()}`, level: 'advanced' });
    const draftId = draftRes.body.data._id;

    const publishedRes = await request(app)
      .post('/api/v1/learning-paths')
      .set('Authorization', authHeader(manager))
      .send({ title: `Real Roadmap ${Date.now()}`, level: 'beginner' });
    await request(app)
      .patch(`/api/v1/learning-paths/${publishedRes.body.data._id}`)
      .set('Authorization', authHeader(manager))
      .send({ isPublished: true });

    const anonListRes = await request(app).get('/api/v1/learning-paths').query({ isPublished: 'false' });
    expect(anonListRes.body.data.some((p) => p._id === draftId)).toBe(false);

    const studentListRes = await request(app)
      .get('/api/v1/learning-paths')
      .set('Authorization', authHeader(student))
      .query({ isPublished: 'false' });
    expect(studentListRes.body.data.some((p) => p._id === draftId)).toBe(false);

    const managerListRes = await request(app)
      .get('/api/v1/learning-paths')
      .set('Authorization', authHeader(manager))
      .query({ isPublished: 'false' });
    expect(managerListRes.body.data.some((p) => p._id === draftId)).toBe(true);
  });

  test('a student cannot create a learning path', async () => {
    const { user: student } = await createUser({ role: 'student' });
    const res = await request(app)
      .post('/api/v1/learning-paths')
      .set('Authorization', authHeader(student))
      .send({ title: 'Unauthorized Path', level: 'beginner' });
    expect(res.status).toBe(403);
  });
});
