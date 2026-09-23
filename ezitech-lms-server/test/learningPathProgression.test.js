const request = require('supertest');
const app = require('../src/app');
const { createUser, createCategory, authHeader, simulateWatching } = require('./helpers/factories');

async function createCourseWithOneLesson(instructor, category, title) {
  const courseRes = await request(app)
    .post('/api/v1/courses')
    .set('Authorization', authHeader(instructor))
    .send({ title, category: category._id.toString(), price: 0 });
  const courseId = courseRes.body.data._id;

  const sectionRes = await request(app)
    .post(`/api/v1/courses/${courseId}/sections`)
    .set('Authorization', authHeader(instructor))
    .send({ title: 'Section', order: 0 });

  const lessonRes = await request(app)
    .post(`/api/v1/courses/${courseId}/lessons`)
    .set('Authorization', authHeader(instructor))
    .send({
      title: 'Lesson',
      section: sectionRes.body.data._id,
      order: 0,
      lessonType: 'video',
      videoUrl: 'https://res.cloudinary.com/demo/video/upload/v1/l.mp4',
      durationSeconds: 30,
    });

  await request(app)
    .patch(`/api/v1/courses/${courseId}/status`)
    .set('Authorization', authHeader(instructor))
    .send({ status: 'published' });

  return { courseId, lessonId: lessonRes.body.data._id };
}

async function createTwoCoursePath(manager, instructor, category) {
  const first = await createCourseWithOneLesson(instructor, category, `Beginner Course ${Date.now()}`);
  const second = await createCourseWithOneLesson(instructor, category, `Intermediate Course ${Date.now()}`);

  const pathRes = await request(app)
    .post('/api/v1/learning-paths')
    .set('Authorization', authHeader(manager))
    .send({ title: `Roadmap ${Date.now()}`, level: 'beginner' });
  const pathId = pathRes.body.data._id;

  await request(app)
    .put(`/api/v1/learning-paths/${pathId}/courses`)
    .set('Authorization', authHeader(manager))
    .send({
      courses: [
        { course: first.courseId, order: 0 },
        { course: second.courseId, order: 1 },
      ],
    });

  await request(app)
    .patch(`/api/v1/learning-paths/${pathId}`)
    .set('Authorization', authHeader(manager))
    .send({ isPublished: true });

  return { pathId, first, second };
}

describe('Learning paths: enrollment and progression', () => {
  test('enrolling in a path enrolls the student in the FIRST course only, not the whole path at once', async () => {
    const { user: manager } = await createUser({ role: 'course_manager' });
    const { user: instructor } = await createUser({ role: 'instructor' });
    const { user: student } = await createUser({ role: 'student' });
    const category = await createCategory();
    const { pathId, first, second } = await createTwoCoursePath(manager, instructor, category);

    const enrollRes = await request(app)
      .post(`/api/v1/enrollments/learning-paths/${pathId}`)
      .set('Authorization', authHeader(student));
    expect(enrollRes.status).toBe(201);

    const myEnrollments = await request(app)
      .get('/api/v1/enrollments/me')
      .set('Authorization', authHeader(student));
    const courseIds = myEnrollments.body.data.map((e) => e.course._id ?? e.course);
    expect(courseIds).toContain(first.courseId);
    expect(courseIds).not.toContain(second.courseId);
  });

  test('enrolling in the same path\'s first course twice is a conflict', async () => {
    const { user: manager } = await createUser({ role: 'course_manager' });
    const { user: instructor } = await createUser({ role: 'instructor' });
    const { user: student } = await createUser({ role: 'student' });
    const category = await createCategory();
    const { pathId } = await createTwoCoursePath(manager, instructor, category);

    await request(app)
      .post(`/api/v1/enrollments/learning-paths/${pathId}`)
      .set('Authorization', authHeader(student));
    const secondAttempt = await request(app)
      .post(`/api/v1/enrollments/learning-paths/${pathId}`)
      .set('Authorization', authHeader(student));

    expect(secondAttempt.status).toBe(409);
  });

  test('progress reflects not-started before enrolling, and updates correctly after starting and completing the first course', async () => {
    const { user: manager } = await createUser({ role: 'course_manager' });
    const { user: instructor } = await createUser({ role: 'instructor' });
    const { user: student } = await createUser({ role: 'student' });
    const category = await createCategory();
    const { pathId, first, second } = await createTwoCoursePath(manager, instructor, category);

    const beforeRes = await request(app)
      .get(`/api/v1/learning-paths/${pathId}/my-progress`)
      .set('Authorization', authHeader(student));
    expect(beforeRes.body.data.hasStarted).toBe(false);
    expect(beforeRes.body.data.percent).toBe(0);

    await request(app)
      .post(`/api/v1/enrollments/learning-paths/${pathId}`)
      .set('Authorization', authHeader(student));

    const midRes = await request(app)
      .get(`/api/v1/learning-paths/${pathId}/my-progress`)
      .set('Authorization', authHeader(student));
    expect(midRes.body.data.hasStarted).toBe(true);
    expect(midRes.body.data.percent).toBe(0);
    expect(midRes.body.data.nextCourse.course._id).toBe(first.courseId);

    await simulateWatching(student, first.courseId);
    await request(app)
      .post(`/api/v1/progress/courses/${first.courseId}/lessons/${first.lessonId}/complete`)
      .set('Authorization', authHeader(student));

    const afterRes = await request(app)
      .get(`/api/v1/learning-paths/${pathId}/my-progress`)
      .set('Authorization', authHeader(student));
    expect(afterRes.body.data.completedCount).toBe(1);
    expect(afterRes.body.data.totalCount).toBe(2);
    expect(afterRes.body.data.percent).toBe(50);
    expect(afterRes.body.data.nextCourse.course._id).toBe(second.courseId);
  });

  test('completing the first course in a path notifies the student that the next course unlocked', async () => {
    const { user: manager } = await createUser({ role: 'course_manager' });
    const { user: instructor } = await createUser({ role: 'instructor' });
    const { user: student } = await createUser({ role: 'student' });
    const category = await createCategory();
    const { pathId, first } = await createTwoCoursePath(manager, instructor, category);

    await request(app)
      .post(`/api/v1/enrollments/learning-paths/${pathId}`)
      .set('Authorization', authHeader(student));
    await simulateWatching(student, first.courseId);
    await request(app)
      .post(`/api/v1/progress/courses/${first.courseId}/lessons/${first.lessonId}/complete`)
      .set('Authorization', authHeader(student));

    const notificationsRes = await request(app)
      .get('/api/v1/notifications')
      .set('Authorization', authHeader(student));
    const unlockNotification = notificationsRes.body.data.find((n) => n.title === 'Next course unlocked');
    expect(unlockNotification).toBeDefined();
  });

  test('a path the student has started appears in "my paths"', async () => {
    const { user: manager } = await createUser({ role: 'course_manager' });
    const { user: instructor } = await createUser({ role: 'instructor' });
    const { user: student } = await createUser({ role: 'student' });
    const category = await createCategory();
    const { pathId } = await createTwoCoursePath(manager, instructor, category);

    await request(app)
      .post(`/api/v1/enrollments/learning-paths/${pathId}`)
      .set('Authorization', authHeader(student));

    const mineRes = await request(app).get('/api/v1/learning-paths/mine').set('Authorization', authHeader(student));
    expect(mineRes.status).toBe(200);
    expect(mineRes.body.data.some((p) => p.path._id === pathId)).toBe(true);
  });

  test('enrolling in an unpublished path\'s first course is rejected', async () => {
    const { user: manager } = await createUser({ role: 'course_manager' });
    const { user: instructor } = await createUser({ role: 'instructor' });
    const { user: student } = await createUser({ role: 'student' });
    const category = await createCategory();
    const { courseId } = await createCourseWithOneLesson(instructor, category, `Solo Course ${Date.now()}`);

    const pathRes = await request(app)
      .post('/api/v1/learning-paths')
      .set('Authorization', authHeader(manager))
      .send({ title: `Draft Roadmap ${Date.now()}`, level: 'beginner' });
    const pathId = pathRes.body.data._id;
    await request(app)
      .put(`/api/v1/learning-paths/${pathId}/courses`)
      .set('Authorization', authHeader(manager))
      .send({ courses: [{ course: courseId, order: 0 }] });

    const res = await request(app)
      .post(`/api/v1/enrollments/learning-paths/${pathId}`)
      .set('Authorization', authHeader(student));
    expect(res.status).toBe(400);
  });
});
