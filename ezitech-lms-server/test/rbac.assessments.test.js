const request = require('supertest');
const app = require('../src/app');
const { createUser, createCategory, authHeader, addMinimumContent } = require('./helpers/factories');

async function createCourseWithAssessment(owner) {
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

  const assessmentRes = await request(app)
    .post('/api/v1/assessments')
    .set('Authorization', authHeader(owner))
    .send({
      course: courseId,
      title: 'Final Project',
      assessmentType: 'project',
      evaluationType: 'manual',
      instructions: 'Submit your project as a link.',
      maxScore: 100,
      isPublished: true,
    });

  return { courseId, assessmentId: assessmentRes.body.data._id };
}

describe('RBAC: assessment ownership', () => {
  test('an instructor cannot update another instructor\'s assessment', async () => {
    const { user: instructorA } = await createUser({ role: 'instructor' });
    const { user: instructorB } = await createUser({ role: 'instructor' });
    const { assessmentId } = await createCourseWithAssessment(instructorA);

    const res = await request(app)
      .patch(`/api/v1/assessments/${assessmentId}`)
      .set('Authorization', authHeader(instructorB))
      .send({ title: 'Hijacked title' });

    expect(res.status).toBe(403);
  });

  test('an instructor cannot delete another instructor\'s assessment', async () => {
    const { user: instructorA } = await createUser({ role: 'instructor' });
    const { user: instructorB } = await createUser({ role: 'instructor' });
    const { assessmentId } = await createCourseWithAssessment(instructorA);

    const res = await request(app)
      .delete(`/api/v1/assessments/${assessmentId}`)
      .set('Authorization', authHeader(instructorB));

    expect(res.status).toBe(403);

    const getRes = await request(app)
      .get(`/api/v1/assessments/${assessmentId}`)
      .set('Authorization', authHeader(instructorA));
    expect(getRes.status).toBe(200);
  });

  test('an instructor cannot read the submission queue or grade a submission for another instructor\'s assessment', async () => {
    const { user: instructorA } = await createUser({ role: 'instructor' });
    const { user: instructorB } = await createUser({ role: 'instructor' });
    const { user: student } = await createUser({ role: 'student' });
    const { courseId, assessmentId } = await createCourseWithAssessment(instructorA);

    await request(app).post('/api/v1/enrollments').set('Authorization', authHeader(student)).send({ courseId });
    const attemptRes = await request(app)
      .post(`/api/v1/assessments/${assessmentId}/attempts`)
      .set('Authorization', authHeader(student));
    const submissionId = attemptRes.body.data.submission._id;
    await request(app)
      .post(`/api/v1/assessments/attempts/${submissionId}/submit`)
      .set('Authorization', authHeader(student))
      .send({ fileUrl: 'https://res.cloudinary.com/demo/raw/upload/v1/project.zip' });

    const listRes = await request(app)
      .get(`/api/v1/assessments/${assessmentId}/submissions`)
      .set('Authorization', authHeader(instructorB));
    expect(listRes.status).toBe(403);

    const gradeRes = await request(app)
      .patch(`/api/v1/assessments/submissions/${submissionId}/grade`)
      .set('Authorization', authHeader(instructorB))
      .send({ score: 100, feedback: 'Great job!' });
    expect(gradeRes.status).toBe(403);

    const ownerGradeRes = await request(app)
      .patch(`/api/v1/assessments/submissions/${submissionId}/grade`)
      .set('Authorization', authHeader(instructorA))
      .send({ score: 90, feedback: 'Solid work.' });
    expect(ownerGradeRes.status).toBe(200);
  });

  test('a grade above the assessment\'s own maximum is rejected', async () => {
    const { user: instructor } = await createUser({ role: 'instructor' });
    const { user: student } = await createUser({ role: 'student' });
    const { courseId, assessmentId } = await createCourseWithAssessment(instructor);

    await request(app).post('/api/v1/enrollments').set('Authorization', authHeader(student)).send({ courseId });
    const attemptRes = await request(app)
      .post(`/api/v1/assessments/${assessmentId}/attempts`)
      .set('Authorization', authHeader(student));
    const submissionId = attemptRes.body.data.submission._id;
    await request(app)
      .post(`/api/v1/assessments/attempts/${submissionId}/submit`)
      .set('Authorization', authHeader(student))
      .send({ fileUrl: 'https://res.cloudinary.com/demo/raw/upload/v1/project.zip' });

    const res = await request(app)
      .patch(`/api/v1/assessments/submissions/${submissionId}/grade`)
      .set('Authorization', authHeader(instructor))
      .send({ score: 150 });

    expect(res.status).toBe(400);
  });

  test('a student who is not enrolled cannot start an attempt', async () => {
    const { user: instructor } = await createUser({ role: 'instructor' });
    const { user: outsider } = await createUser({ role: 'student' });
    const { assessmentId } = await createCourseWithAssessment(instructor);

    const res = await request(app)
      .post(`/api/v1/assessments/${assessmentId}/attempts`)
      .set('Authorization', authHeader(outsider));

    expect(res.status).toBe(403);
  });
});
