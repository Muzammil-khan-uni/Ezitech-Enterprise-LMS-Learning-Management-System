const request = require('supertest');
const app = require('../src/app');
const { Enrollment } = require('../src/models/Enrollment.model');
const Progress = require('../src/models/Progress.model');
const { Assessment } = require('../src/models/Assessment.model');
const { Submission } = require('../src/models/Submission.model');
const Thread = require('../src/models/Thread.model');
const Comment = require('../src/models/Comment.model');
const Certificate = require('../src/models/Certificate.model');
const {
  createUser,
  createCategory,
  createDefaultCertificateTemplate,
  authHeader,
  simulateWatching,
} = require('./helpers/factories');

describe('Cascading delete: deleting a course cleans up every course-scoped record', () => {
  test('sections, lessons, assessments, submissions, enrollments, progress, threads and comments are all removed - but a previously-issued certificate is preserved', async () => {
    const { user: admin } = await createUser({ role: 'admin' });
    const { user: instructor } = await createUser({ role: 'instructor' });
    const { user: student } = await createUser({ role: 'student' });
    await createDefaultCertificateTemplate(admin);
    const category = await createCategory();

    const courseRes = await request(app)
      .post('/api/v1/courses')
      .set('Authorization', authHeader(instructor))
      .send({ title: `Doomed Course ${Date.now()}`, category: category._id.toString() });
    const courseId = courseRes.body.data._id;

    const sectionRes = await request(app)
      .post(`/api/v1/courses/${courseId}/sections`)
      .set('Authorization', authHeader(instructor))
      .send({ title: 'Only Section', order: 0 });
    const lessonRes = await request(app)
      .post(`/api/v1/courses/${courseId}/lessons`)
      .set('Authorization', authHeader(instructor))
      .send({
        title: 'Only Lesson',
        section: sectionRes.body.data._id,
        order: 0,
        lessonType: 'video',
        videoUrl: 'https://res.cloudinary.com/demo/video/upload/v1/only.mp4',
        durationSeconds: 60,
      });
    const assessmentRes = await request(app)
      .post('/api/v1/assessments')
      .set('Authorization', authHeader(instructor))
      .send({
        course: courseId,
        title: 'Only Assessment',
        assessmentType: 'project',
        evaluationType: 'manual',
        instructions: 'Do the thing.',
        maxScore: 100,
        isPublished: true,
      });
    await request(app)
      .patch(`/api/v1/courses/${courseId}/status`)
      .set('Authorization', authHeader(instructor))
      .send({ status: 'published' });

    await request(app).post('/api/v1/enrollments').set('Authorization', authHeader(student)).send({ courseId });
    await simulateWatching(student, courseId);
    await request(app)
      .post(`/api/v1/progress/courses/${courseId}/lessons/${lessonRes.body.data._id}/complete`)
      .set('Authorization', authHeader(student));

    const attemptRes = await request(app)
      .post(`/api/v1/assessments/${assessmentRes.body.data._id}/attempts`)
      .set('Authorization', authHeader(student));
    await request(app)
      .post(`/api/v1/assessments/attempts/${attemptRes.body.data.submission._id}/submit`)
      .set('Authorization', authHeader(student))
      .send({ fileUrl: 'https://res.cloudinary.com/demo/raw/upload/v1/only.zip' });
    await request(app)
      .patch(`/api/v1/assessments/submissions/${attemptRes.body.data.submission._id}/grade`)
      .set('Authorization', authHeader(instructor))
      .send({ score: 90, feedback: 'Good work' });

    await request(app)
      .post(`/api/v1/discussions/courses/${courseId}/threads`)
      .set('Authorization', authHeader(student))
      .send({ title: 'A question before it all disappears', body: 'Testing cascade delete.' });

    expect(await Enrollment.countDocuments({ course: courseId })).toBe(1);
    expect(await Progress.countDocuments({ course: courseId })).toBe(1);
    expect(await Assessment.countDocuments({ course: courseId })).toBe(1);
    expect(await Submission.countDocuments({ _id: attemptRes.body.data.submission._id })).toBe(1);
    expect(await Thread.countDocuments({ course: courseId })).toBe(1);
    expect(await Certificate.countDocuments({ course: courseId })).toBe(1);

    const deleteRes = await request(app)
      .delete(`/api/v1/courses/${courseId}`)
      .set('Authorization', authHeader(instructor));
    expect(deleteRes.status).toBe(200);

    expect(await Enrollment.countDocuments({ course: courseId })).toBe(0);
    expect(await Progress.countDocuments({ course: courseId })).toBe(0);
    expect(await Assessment.countDocuments({ course: courseId })).toBe(0);
    expect(await Submission.countDocuments({ _id: attemptRes.body.data.submission._id })).toBe(0);
    const remainingThreads = await Thread.find({ course: courseId }).select('_id');
    expect(remainingThreads).toHaveLength(0);
    expect(await Comment.countDocuments({ thread: { $in: remainingThreads.map((t) => t._id) } })).toBe(0);

    const certificate = await Certificate.findOne({ course: courseId });
    expect(certificate).not.toBeNull();

    const verifyRes = await request(app).get(`/api/v1/certificates/verify/${certificate.verificationCode}`);
    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body.data.valid).toBe(true);
    expect(verifyRes.body.data.courseTitle).toEqual(expect.any(String));
  });
});
