const request = require('supertest');
const app = require('../src/app');
const { createUser, createCategory, authHeader, objectId } = require('./helpers/factories');

async function createPublishedCourseWithLesson(instructor) {
  const category = await createCategory();

  const courseRes = await request(app)
    .post('/api/v1/courses')
    .set('Authorization', authHeader(instructor))
    .send({ title: `Course ${Date.now()}`, category: category._id.toString(), price: 0 });
  const courseId = courseRes.body.data._id;

  const sectionRes = await request(app)
    .post(`/api/v1/courses/${courseId}/sections`)
    .set('Authorization', authHeader(instructor))
    .send({ title: 'Section 1', order: 0 });
  const sectionId = sectionRes.body.data._id;

  const lessonRes = await request(app)
    .post(`/api/v1/courses/${courseId}/lessons`)
    .set('Authorization', authHeader(instructor))
    .send({
      title: 'Lesson 1',
      section: sectionId,
      order: 0,
      lessonType: 'video',
      videoUrl: 'https://res.cloudinary.com/demo/video/upload/v1/lesson1.mp4',
      durationSeconds: 300,
    });
  const lessonId = lessonRes.body.data._id;

  await request(app)
    .patch(`/api/v1/courses/${courseId}/status`)
    .set('Authorization', authHeader(instructor))
    .send({ status: 'published' });

  return { courseId, sectionId, lessonId };
}

describe('RBAC: course content gating', () => {
  test('an anonymous visitor sees a published course and its lesson outline, with content URLs stripped', async () => {
    const { user: instructor } = await createUser({ role: 'instructor' });
    const { courseId, lessonId } = await createPublishedCourseWithLesson(instructor);

    const lessonsRes = await request(app).get(`/api/v1/courses/${courseId}/lessons`);
    expect(lessonsRes.status).toBe(200);
    expect(lessonsRes.body.data).toHaveLength(1);
    const [lesson] = lessonsRes.body.data;
    expect(lesson._id).toBe(lessonId);
    expect(lesson.title).toBe('Lesson 1');
    expect(lesson.locked).toBe(true);
    expect(lesson.videoUrl).toBeUndefined();

    const singleLessonRes = await request(app).get(`/api/v1/courses/${courseId}/lessons/${lessonId}`);
    expect(singleLessonRes.status).toBe(403);
  });

  test('an enrolled student sees the full lesson content', async () => {
    const { user: instructor } = await createUser({ role: 'instructor' });
    const { user: student } = await createUser({ role: 'student' });
    const { courseId, lessonId } = await createPublishedCourseWithLesson(instructor);

    await request(app)
      .post('/api/v1/enrollments')
      .set('Authorization', authHeader(student))
      .send({ courseId });

    const lessonsRes = await request(app)
      .get(`/api/v1/courses/${courseId}/lessons`)
      .set('Authorization', authHeader(student));
    expect(lessonsRes.body.data[0].locked).toBe(false);
    expect(lessonsRes.body.data[0].videoUrl).toEqual(expect.any(String));

    const singleLessonRes = await request(app)
      .get(`/api/v1/courses/${courseId}/lessons/${lessonId}`)
      .set('Authorization', authHeader(student));
    expect(singleLessonRes.status).toBe(200);
    expect(singleLessonRes.body.data.videoUrl).toEqual(expect.any(String));
  });

  test('a student who is NOT enrolled cannot see lesson content even when logged in', async () => {
    const { user: instructor } = await createUser({ role: 'instructor' });
    const { user: otherStudent } = await createUser({ role: 'student' });
    const { courseId, lessonId } = await createPublishedCourseWithLesson(instructor);

    const lessonsRes = await request(app)
      .get(`/api/v1/courses/${courseId}/lessons`)
      .set('Authorization', authHeader(otherStudent));
    expect(lessonsRes.body.data[0].videoUrl).toBeUndefined();

    const singleLessonRes = await request(app)
      .get(`/api/v1/courses/${courseId}/lessons/${lessonId}`)
      .set('Authorization', authHeader(otherStudent));
    expect(singleLessonRes.status).toBe(403);
  });

  test('a preview lesson is visible to anonymous visitors even without enrollment', async () => {
    const { user: instructor } = await createUser({ role: 'instructor' });
    const category = await createCategory();
    const courseRes = await request(app)
      .post('/api/v1/courses')
      .set('Authorization', authHeader(instructor))
      .send({ title: `Preview Course ${Date.now()}`, category: category._id.toString() });
    const courseId = courseRes.body.data._id;
    const sectionRes = await request(app)
      .post(`/api/v1/courses/${courseId}/sections`)
      .set('Authorization', authHeader(instructor))
      .send({ title: 'Section 1', order: 0 });
    const lessonRes = await request(app)
      .post(`/api/v1/courses/${courseId}/lessons`)
      .set('Authorization', authHeader(instructor))
      .send({
        title: 'Free Preview',
        section: sectionRes.body.data._id,
        order: 0,
        lessonType: 'video',
        videoUrl: 'https://res.cloudinary.com/demo/video/upload/v1/preview.mp4',
        durationSeconds: 60,
        isPreview: true,
      });
    await request(app)
      .patch(`/api/v1/courses/${courseId}/status`)
      .set('Authorization', authHeader(instructor))
      .send({ status: 'published' });

    const res = await request(app).get(`/api/v1/courses/${courseId}/lessons/${lessonRes.body.data._id}`);
    expect(res.status).toBe(200);
    expect(res.body.data.videoUrl).toEqual(expect.any(String));
  });

  test('a draft course is invisible to anonymous visitors and to an unrelated student (404, not 403 - no existence disclosure), but visible to admin', async () => {
    const { user: instructor } = await createUser({ role: 'instructor' });
    const { user: otherStudent } = await createUser({ role: 'student' });
    const { user: admin } = await createUser({ role: 'admin' });
    const category = await createCategory();

    const courseRes = await request(app)
      .post('/api/v1/courses')
      .set('Authorization', authHeader(instructor))
      .send({ title: `Draft Course ${Date.now()}`, category: category._id.toString() });
    const courseId = courseRes.body.data._id;

    const anonRes = await request(app).get(`/api/v1/courses/${courseId}`);
    expect(anonRes.status).toBe(404);

    const studentRes = await request(app)
      .get(`/api/v1/courses/${courseId}`)
      .set('Authorization', authHeader(otherStudent));
    expect(studentRes.status).toBe(404);

    const adminRes = await request(app).get(`/api/v1/courses/${courseId}`).set('Authorization', authHeader(admin));
    expect(adminRes.status).toBe(200);

    const ownerRes = await request(app)
      .get(`/api/v1/courses/${courseId}`)
      .set('Authorization', authHeader(instructor));
    expect(ownerRes.status).toBe(200);
  });

  test('?status=draft cannot be used to enumerate unpublished courses as an anonymous or unprivileged caller', async () => {
    const { user: instructor } = await createUser({ role: 'instructor' });
    const category = await createCategory();
    await request(app)
      .post('/api/v1/courses')
      .set('Authorization', authHeader(instructor))
      .send({ title: `Sneaky Draft ${Date.now()}`, category: category._id.toString() });

    const res = await request(app).get('/api/v1/courses').query({ status: 'draft' });
    expect(res.status).toBe(200);
    expect(res.body.data.every((c) => c.status !== 'draft')).toBe(true);
  });

  test('a non-existent lesson id under a real course still 404s for an unentitled viewer (not leaking whether it exists)', async () => {
    const { user: instructor } = await createUser({ role: 'instructor' });
    const { courseId } = await createPublishedCourseWithLesson(instructor);

    const res = await request(app).get(`/api/v1/courses/${courseId}/lessons/${objectId()}`);
    expect(res.status).toBe(404);
  });
});
