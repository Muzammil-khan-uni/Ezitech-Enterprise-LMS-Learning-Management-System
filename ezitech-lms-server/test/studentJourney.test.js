const request = require('supertest');
const app = require('../src/app');
const {
  createUser,
  createCategory,
  createDefaultCertificateTemplate,
  authHeader,
  simulateWatching,
} = require('./helpers/factories');

describe('Critical student journey: enroll -> learn -> submit -> get graded -> get certificate', () => {
  test('a student can complete an entire course end to end', async () => {
    const { user: admin } = await createUser({ role: 'admin' });
    const { user: instructor } = await createUser({ role: 'instructor' });
    const { user: student } = await createUser({ role: 'student' });

    await createDefaultCertificateTemplate(admin);
    const category = await createCategory();

    const courseRes = await request(app)
      .post('/api/v1/courses')
      .set('Authorization', authHeader(instructor))
      .send({ title: `Intro to Testing ${Date.now()}`, category: category._id.toString(), price: 0 });
    expect(courseRes.status).toBe(201);
    const courseId = courseRes.body.data._id;

    const sectionRes = await request(app)
      .post(`/api/v1/courses/${courseId}/sections`)
      .set('Authorization', authHeader(instructor))
      .send({ title: 'Getting Started', order: 0 });
    const sectionId = sectionRes.body.data._id;

    const lessonRes = await request(app)
      .post(`/api/v1/courses/${courseId}/lessons`)
      .set('Authorization', authHeader(instructor))
      .send({
        title: 'Welcome',
        section: sectionId,
        order: 0,
        lessonType: 'video',
        videoUrl: 'https://res.cloudinary.com/demo/video/upload/v1/welcome.mp4',
        durationSeconds: 120,
      });
    const lessonId = lessonRes.body.data._id;

    const assessmentRes = await request(app)
      .post('/api/v1/assessments')
      .set('Authorization', authHeader(instructor))
      .send({
        course: courseId,
        title: 'Capstone Project',
        assessmentType: 'project',
        evaluationType: 'manual',
        instructions: 'Submit a link to your finished project.',
        maxScore: 100,
        isPublished: true,
      });
    const assessmentId = assessmentRes.body.data._id;

    const publishRes = await request(app)
      .patch(`/api/v1/courses/${courseId}/status`)
      .set('Authorization', authHeader(instructor))
      .send({ status: 'published' });
    expect(publishRes.body.data.status).toBe('published');

    const enrollRes = await request(app)
      .post('/api/v1/enrollments')
      .set('Authorization', authHeader(student))
      .send({ courseId });
    expect(enrollRes.status).toBe(201);
    expect(enrollRes.body.data.status).toBe('active');

    await simulateWatching(student, courseId);
    const completeRes = await request(app)
      .post(`/api/v1/progress/courses/${courseId}/lessons/${lessonId}/complete`)
      .set('Authorization', authHeader(student));
    expect(completeRes.status).toBe(200);
    expect(completeRes.body.data.percent).toBe(50);

    const progressRes = await request(app)
      .get(`/api/v1/progress/courses/${courseId}`)
      .set('Authorization', authHeader(student));
    expect(progressRes.status).toBe(200);

    const earlyCertificates = await request(app)
      .get('/api/v1/certificates/me')
      .set('Authorization', authHeader(student));
    expect(earlyCertificates.body.data).toHaveLength(0);

    const attemptRes = await request(app)
      .post(`/api/v1/assessments/${assessmentId}/attempts`)
      .set('Authorization', authHeader(student));
    expect(attemptRes.status).toBe(201);
    const submissionId = attemptRes.body.data.submission._id;

    const submitRes = await request(app)
      .post(`/api/v1/assessments/attempts/${submissionId}/submit`)
      .set('Authorization', authHeader(student))
      .send({ fileUrl: 'https://res.cloudinary.com/demo/raw/upload/v1/capstone.zip' });
    expect(submitRes.status).toBe(200);
    expect(submitRes.body.data.status).toBe('submitted');

    const gradingQueueRes = await request(app)
      .get(`/api/v1/assessments/${assessmentId}/submissions`)
      .set('Authorization', authHeader(instructor));
    expect(gradingQueueRes.status).toBe(200);
    expect(gradingQueueRes.body.data.some((s) => s._id === submissionId)).toBe(true);

    const gradeRes = await request(app)
      .patch(`/api/v1/assessments/submissions/${submissionId}/grade`)
      .set('Authorization', authHeader(instructor))
      .send({ score: 95, feedback: 'Excellent work overall.' });
    expect(gradeRes.status).toBe(200);
    expect(gradeRes.body.data.status).toBe('graded');
    expect(gradeRes.body.data.score).toBe(95);
    expect(gradeRes.body.data.passed).toBe(true);

    const finishedProgress = await request(app)
      .get(`/api/v1/progress/courses/${courseId}`)
      .set('Authorization', authHeader(student));
    expect(finishedProgress.body.data.progressPercent).toBe(100);

    const certificatesRes = await request(app)
      .get('/api/v1/certificates/me')
      .set('Authorization', authHeader(student));
    expect(certificatesRes.status).toBe(200);
    expect(certificatesRes.body.data).toHaveLength(1);
    const certificate = certificatesRes.body.data[0];
    expect(certificate.course._id ?? certificate.course).toEqual(expect.anything());

    const verifyRes = await request(app).get(`/api/v1/certificates/verify/${certificate.verificationCode}`);
    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body.data.valid).toBe(true);
    expect(verifyRes.body.data.certificateNumber).toBe(certificate.certificateNumber);

    const myAttemptsRes = await request(app)
      .get(`/api/v1/assessments/${assessmentId}/attempts/me`)
      .set('Authorization', authHeader(student));
    expect(myAttemptsRes.status).toBe(200);
    expect(myAttemptsRes.body.data.some((s) => s._id === submissionId && s.status === 'graded')).toBe(true);
  });

  test('a certificate is NOT issued when no default template has been configured (documented setup gap, not a crash)', async () => {
    const { user: instructor } = await createUser({ role: 'instructor' });
    const { user: student } = await createUser({ role: 'student' });
    const category = await createCategory();

    const courseRes = await request(app)
      .post('/api/v1/courses')
      .set('Authorization', authHeader(instructor))
      .send({ title: `No Template Course ${Date.now()}`, category: category._id.toString() });
    const courseId = courseRes.body.data._id;
    const sectionRes = await request(app)
      .post(`/api/v1/courses/${courseId}/sections`)
      .set('Authorization', authHeader(instructor))
      .send({ title: 'Section', order: 0 });
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
    await request(app)
      .patch(`/api/v1/courses/${courseId}/status`)
      .set('Authorization', authHeader(instructor))
      .send({ status: 'published' });
    await request(app).post('/api/v1/enrollments').set('Authorization', authHeader(student)).send({ courseId });

    await simulateWatching(student, courseId);
    const completeRes = await request(app)
      .post(`/api/v1/progress/courses/${courseId}/lessons/${lessonRes.body.data._id}/complete`)
      .set('Authorization', authHeader(student));
    expect(completeRes.status).toBe(200);
    expect(completeRes.body.data.percent).toBe(100);

    const certificatesRes = await request(app)
      .get('/api/v1/certificates/me')
      .set('Authorization', authHeader(student));
    expect(certificatesRes.body.data).toHaveLength(0);
  });
});
