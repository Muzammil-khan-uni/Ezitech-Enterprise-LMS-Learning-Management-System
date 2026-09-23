const request = require('supertest');
const app = require('../src/app');
const Progress = require('../src/models/Progress.model');
const Attendance = require('../src/models/Attendance.model');
const ScormProgress = require('../src/models/ScormProgress.model');
const Certificate = require('../src/models/Certificate.model');
const LearningPath = require('../src/models/LearningPath.model');
const { Course } = require('../src/models/Course.model');
const { Lesson } = require('../src/models/Lesson.model');
const { Enrollment } = require('../src/models/Enrollment.model');
const { LiveSession } = require('../src/models/LiveSession.model');
const { Assessment } = require('../src/models/Assessment.model');
const { Notification } = require('../src/models/Notification.model');
const { scanForUpcomingDeadlines } = require('../src/jobs/deadline-reminder.job');
const {
  createUser,
  createCategory,
  createDefaultCertificateTemplate,
  authHeader,
  addMinimumContent,
  simulateWatching,
} = require('./helpers/factories');

const api = (method, url, user) => {
  const req = request(app)[method](`/api/v1${url}`);
  return user ? req.set('Authorization', authHeader(user)) : req;
};

async function newCourse(instructor, { price = 0, publish = true, content = true } = {}) {
  const category = await createCategory();
  const res = await api('post', '/courses', instructor).send({
    title: `Course ${Date.now()}-${Math.random().toString(16).slice(2, 6)}`,
    category: category._id.toString(),
    price,
  });
  const courseId = res.body.data._id;
  if (content) await addMinimumContent(courseId, instructor);
  if (publish) await api('patch', `/courses/${courseId}/status`, instructor).send({ status: 'published' });
  return courseId;
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function eventually(check, { attempts = 20, delay = 150 } = {}) {
  for (let i = 0; i < attempts; i += 1) {
    if (await check()) return true;
    await wait(delay);
  }
  return false;
}

describe('Editing keeps what you changed', () => {
  test('lesson-type fields such as the video URL and duration are actually saved', async () => {
    const { user: instructor } = await createUser({ role: 'instructor' });
    const courseId = await newCourse(instructor, { publish: false });
    const lesson = await Lesson.findOne({ course: courseId });

    const res = await api('patch', `/courses/${courseId}/lessons/${lesson._id}`, instructor).send({
      title: 'Renamed lesson',
      videoUrl: 'https://res.cloudinary.com/demo/video/upload/v1/replacement.mp4',
      durationSeconds: 300,
    });
    expect(res.status).toBe(200);

    const stored = await Lesson.findById(lesson._id);
    expect(stored.title).toBe('Renamed lesson');
    expect(stored.videoUrl).toBe('https://res.cloudinary.com/demo/video/upload/v1/replacement.mp4');
    expect(stored.durationSeconds).toBe(300);
    expect(stored.lessonType).toBe('video');
  });

  test('quiz questions, time limit and pass mark are actually saved, and the type cannot be switched', async () => {
    const { user: instructor } = await createUser({ role: 'instructor' });
    const courseId = await newCourse(instructor, { publish: false });
    const created = await api('post', '/assessments', instructor).send({
      course: courseId,
      title: 'Original quiz',
      assessmentType: 'quiz',
      evaluationType: 'auto',
      questions: [{ questionText: 'Old?', options: [{ text: 'A', isCorrect: true }, { text: 'B', isCorrect: false }] }],
    });
    const assessmentId = created.body.data._id;

    const res = await api('patch', `/assessments/${assessmentId}`, instructor).send({
      title: 'Edited quiz',
      timeLimitMinutes: 25,
      passingScorePercent: 80,
      questions: [
        { questionText: 'New?', options: [{ text: 'Yes', isCorrect: true }, { text: 'No', isCorrect: false }, { text: 'Maybe', isCorrect: false }] },
      ],
    });
    expect(res.status).toBe(200);

    const stored = await Assessment.findById(assessmentId);
    expect(stored.title).toBe('Edited quiz');
    expect(stored.timeLimitMinutes).toBe(25);
    expect(stored.passingScorePercent).toBe(80);
    expect(stored.questions).toHaveLength(1);
    expect(stored.questions[0].questionText).toBe('New?');
    expect(stored.questions[0].options).toHaveLength(3);
    expect(stored.assessmentType).toBe('quiz');
  });
});

describe('Progress cannot be faked', () => {
  async function enrolledStudent() {
    const { user: instructor } = await createUser({ role: 'instructor' });
    const { user: student } = await createUser({ role: 'student' });
    const courseId = await newCourse(instructor);
    await api('post', '/enrollments', student).send({ courseId });
    const lesson = await Lesson.findOne({ course: courseId });
    return { instructor, student, courseId, lesson };
  }

  test('a video lesson cannot be marked complete without watching it', async () => {
    const { student, courseId, lesson } = await enrolledStudent();
    const res = await api('post', `/progress/courses/${courseId}/lessons/${lesson._id}/complete`, student);
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/watch/i);
    expect(await Progress.countDocuments({ student: student._id, isCompleted: true })).toBe(0);
  });

  test('reporting a position at the end of the video (or a made-up duration) earns no credit and does not complete it', async () => {
    const { student, courseId, lesson } = await enrolledStudent();
    const report = (positionSeconds, extra = {}) =>
      api('post', `/progress/courses/${courseId}/lessons/${lesson._id}/video-position`, student).send({ positionSeconds, ...extra });

    expect((await report(0)).status).toBe(200);
    const jump = await report(119, { durationSeconds: 1 });
    expect(jump.status).toBe(200);
    expect(jump.body.data.completed).toBe(false);

    const stored = await Progress.findOne({ student: student._id, lesson: lesson._id });
    expect(stored.isCompleted).toBe(false);
    expect(stored.watchedSeconds).toBeLessThan(10);
  });

  test('genuine playback is credited at up to a realistic speed and completes the lesson', async () => {
    const { student, courseId, lesson } = await enrolledStudent();
    const report = (positionSeconds) =>
      api('post', `/progress/courses/${courseId}/lessons/${lesson._id}/video-position`, student).send({ positionSeconds });

    await report(0);
    await Progress.updateOne({ student: student._id, lesson: lesson._id }, { $set: { lastReportAt: new Date(Date.now() - 10000) } });
    await report(10);
    let stored = await Progress.findOne({ student: student._id, lesson: lesson._id });
    expect(stored.watchedSeconds).toBeGreaterThanOrEqual(9);
    expect(stored.watchedSeconds).toBeLessThanOrEqual(11);

    await Progress.updateOne(
      { student: student._id, lesson: lesson._id },
      { $set: { watchedSeconds: 110, lastPositionSeconds: 110, lastReportAt: new Date(Date.now() - 10000) } }
    );
    const finished = await report(119);
    expect(finished.status).toBe(200);
    expect(finished.body.data.percent).toBe(100);

    stored = await Progress.findOne({ student: student._id, lesson: lesson._id });
    expect(stored.isCompleted).toBe(true);
    expect(await Certificate.countDocuments({ student: student._id, course: courseId })).toBe(0);
  });

  test('interactive lessons cannot be completed from outside their player', async () => {
    const { instructor, student, courseId } = await enrolledStudent();
    const course = await Course.findById(courseId);
    expect(course).toBeTruthy();
    const section = await Lesson.findOne({ course: courseId }).select('section');
    const scorm = await Lesson.create({
      course: courseId,
      section: section.section,
      title: 'Interactive',
      order: 5,
      lessonType: 'scorm',
      packageUrl: 'https://example.com/api/v1/scorm/packages/x',
      entryPoint: 'index.html',
    });
    const res = await api('post', `/progress/courses/${courseId}/lessons/${scorm._id}/complete`, student);
    expect(res.status).toBe(400);
    expect(instructor).toBeTruthy();
  });

  test('a lesson linked to an assessment stays locked until that assessment is passed', async () => {
    const { instructor, student, courseId, lesson } = await enrolledStudent();
    const assessment = await api('post', '/assessments', instructor).send({
      course: courseId,
      lesson: lesson._id.toString(),
      title: 'Lesson check',
      assessmentType: 'project',
      evaluationType: 'manual',
      instructions: 'Show your work',
      maxScore: 100,
      isPublished: true,
    });
    await simulateWatching(student, courseId);

    const locked = await api('post', `/progress/courses/${courseId}/lessons/${lesson._id}/complete`, student);
    expect(locked.status).toBe(400);
    expect(locked.body.message).toMatch(/assessment/i);

    const attempt = await api('post', `/assessments/${assessment.body.data._id}/attempts`, student).send();
    const submissionId = attempt.body.data.submission._id;
    await api('post', `/assessments/attempts/${submissionId}/submit`, student).send({ fileUrl: 'https://example.com/work.zip' });
    await api('patch', `/assessments/submissions/${submissionId}/grade`, instructor).send({ score: 80, feedback: 'ok' });

    const open = await api('post', `/progress/courses/${courseId}/lessons/${lesson._id}/complete`, student);
    expect(open.status).toBe(200);
    expect(open.body.data.percent).toBe(100);
  });

  test('finishing every lesson is not enough while a published quiz is failed; passing it completes the course and issues the certificate', async () => {
    const { user: admin } = await createUser({ role: 'admin' });
    await createDefaultCertificateTemplate(admin);
    const { instructor, student, courseId, lesson } = await enrolledStudent();
    const quiz = await api('post', '/assessments', instructor).send({
      course: courseId,
      title: 'Final quiz',
      assessmentType: 'quiz',
      evaluationType: 'auto',
      passingScorePercent: 60,
      maxAttempts: 3,
      isPublished: true,
      questions: [{ questionText: 'Pick A', options: [{ text: 'A', isCorrect: true }, { text: 'B', isCorrect: false }] }],
    });
    const quizId = quiz.body.data._id;
    const questionId = quiz.body.data.questions[0]._id;

    await simulateWatching(student, courseId);
    const done = await api('post', `/progress/courses/${courseId}/lessons/${lesson._id}/complete`, student);
    expect(done.body.data.percent).toBe(50);

    const answer = async (index) => {
      const attempt = await api('post', `/assessments/${quizId}/attempts`, student).send();
      return api('post', `/assessments/attempts/${attempt.body.data.submission._id}/submit`, student).send({
        quizAnswers: [{ questionId, selectedOptionIndexes: [index] }],
      });
    };

    const failed = await answer(1);
    expect(failed.body.data.passed).toBe(false);
    expect((await Enrollment.findOne({ student: student._id, course: courseId })).progressPercent).toBe(50);
    expect(await Certificate.countDocuments({ student: student._id })).toBe(0);

    const passed = await answer(0);
    expect(passed.body.data.passed).toBe(true);
    const enrollment = await Enrollment.findOne({ student: student._id, course: courseId });
    expect(enrollment.progressPercent).toBe(100);
    expect(enrollment.status).toBe('completed');
    expect(await Certificate.countDocuments({ student: student._id, course: courseId })).toBe(1);
  });

  test('deleting a lesson removes its progress and recalculates everyone\'s percentage', async () => {
    const { instructor, student, courseId, lesson } = await enrolledStudent();
    const sectionId = lesson.section;
    const extra = await api('post', `/courses/${courseId}/lessons`, instructor).send({
      title: 'Second lesson',
      section: sectionId.toString(),
      order: 1,
      lessonType: 'video',
      videoUrl: 'https://res.cloudinary.com/demo/video/upload/v1/second.mp4',
      durationSeconds: 60,
    });
    expect(extra.status).toBe(201);

    await simulateWatching(student, courseId);
    await api('post', `/progress/courses/${courseId}/lessons/${lesson._id}/complete`, student);
    expect((await Enrollment.findOne({ student: student._id, course: courseId })).progressPercent).toBe(50);

    const removed = await api('delete', `/courses/${courseId}/lessons/${extra.body.data._id}`, instructor);
    expect(removed.status).toBe(200);
    const updated = await eventually(
      async () => (await Enrollment.findOne({ student: student._id, course: courseId })).progressPercent === 100
    );
    expect(updated).toBe(true);
    expect(await Progress.countDocuments({ lesson: extra.body.data._id })).toBe(0);
  });
});

describe('Learning path enrollment follows the normal enrollment rules', () => {
  async function pathWith(courseIds, creator) {
    return LearningPath.create({
      title: 'Path',
      slug: `path-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`,
      level: 'beginner',
      isPublished: true,
      createdBy: creator._id,
      courses: courseIds.map((course, order) => ({ course, order })),
    });
  }

  test('a draft first course is refused and a priced first course records what was charged', async () => {
    const { user: instructor } = await createUser({ role: 'instructor' });
    const { user: student } = await createUser({ role: 'student' });

    const draft = await newCourse(instructor, { publish: false });
    const draftPath = await pathWith([draft], instructor);
    const refused = await api('post', `/enrollments/learning-paths/${draftPath._id}`, student);
    expect(refused.status).toBe(400);
    expect(await Enrollment.countDocuments({ student: student._id })).toBe(0);

    const priced = await newCourse(instructor, { price: 49 });
    const pricedPath = await pathWith([priced], instructor);
    const ok = await api('post', `/enrollments/learning-paths/${pricedPath._id}`, student);
    expect(ok.status).toBe(201);
    const enrollment = await Enrollment.findOne({ student: student._id, course: priced });
    expect(enrollment.pricePaid).toBe(49);
    expect(String(enrollment.learningPath)).toBe(String(pricedPath._id));
  });

  test('a course that no longer exists is skipped instead of crashing', async () => {
    const { user: instructor } = await createUser({ role: 'instructor' });
    const { user: student } = await createUser({ role: 'student' });
    const gone = await newCourse(instructor);
    const kept = await newCourse(instructor);
    const path = await pathWith([gone, kept], instructor);
    await Course.deleteOne({ _id: gone });

    const res = await api('post', `/enrollments/learning-paths/${path._id}`, student);
    expect(res.status).toBe(201);
    expect(String(res.body.data.course)).toBe(String(kept));
  });
});

describe('Course lifecycle', () => {
  test('a course with paying students cannot be deleted, but it can be archived', async () => {
    const { user: instructor } = await createUser({ role: 'instructor' });
    const { user: student } = await createUser({ role: 'student' });
    const courseId = await newCourse(instructor, { price: 30 });
    await api('post', '/enrollments', student).send({ courseId });

    const blocked = await api('delete', `/courses/${courseId}`, instructor);
    expect(blocked.status).toBe(409);
    expect(await Course.exists({ _id: courseId })).toBeTruthy();
    expect(await Enrollment.countDocuments({ course: courseId })).toBe(1);

    const archived = await api('patch', `/courses/${courseId}/status`, instructor).send({ status: 'archived' });
    expect(archived.status).toBe(200);
  });

  test('deleting a course removes its live sessions, attendance, SCORM data and links from paths and prerequisites, and keeps certificates readable', async () => {
    const { user: admin } = await createUser({ role: 'admin' });
    await createDefaultCertificateTemplate(admin);
    const { user: instructor } = await createUser({ role: 'instructor' });
    const { user: student } = await createUser({ role: 'student' });
    const courseId = await newCourse(instructor);
    const dependent = await newCourse(instructor);
    await Course.updateOne({ _id: dependent }, { $set: { prerequisites: [courseId] } });
    const path = await LearningPath.create({
      title: 'P',
      slug: `p-${Date.now()}`,
      level: 'beginner',
      createdBy: instructor._id,
      courses: [{ course: courseId, order: 0 }, { course: dependent, order: 1 }],
    });

    const session = await LiveSession.create({ course: courseId, instructor: instructor._id, title: 'Live', scheduledAt: new Date() });
    await Attendance.create({ liveSession: session._id, course: courseId, student: student._id, joinedAt: new Date() });
    await ScormProgress.create({ student: student._id, course: courseId, lesson: (await Lesson.findOne({ course: courseId }))._id });

    await api('post', '/enrollments', student).send({ courseId });
    await simulateWatching(student, courseId);
    const lesson = await Lesson.findOne({ course: courseId });
    await api('post', `/progress/courses/${courseId}/lessons/${lesson._id}/complete`, student);
    const certificate = await Certificate.findOne({ student: student._id, course: courseId });
    expect(certificate.courseTitle).toEqual(expect.any(String));

    const res = await api('delete', `/courses/${courseId}`, instructor);
    expect(res.status).toBe(200);

    expect(await LiveSession.countDocuments({ course: courseId })).toBe(0);
    expect(await Attendance.countDocuments({ course: courseId })).toBe(0);
    expect(await ScormProgress.countDocuments({ course: courseId })).toBe(0);
    expect((await Course.findById(dependent).select('prerequisites')).prerequisites).toHaveLength(0);
    expect((await LearningPath.findById(path._id)).courses).toHaveLength(1);

    const verified = await api('get', `/certificates/verify/${certificate.verificationCode}`);
    expect(verified.body.data.courseTitle).toBe(certificate.courseTitle);

    const pdf = await api('get', `/certificates/${certificate._id}/download`, student);
    expect(pdf.status).toBe(200);
    expect(pdf.headers['content-type']).toContain('pdf');
  });

  test('the course list caps how many results one request can ask for', async () => {
    const res = await api('get', '/courses?limit=100000&page=-4');
    expect(res.status).toBe(200);
    expect(res.body.meta.limit).toBe(100);
    expect(res.body.meta.page).toBe(1);
  });
});

describe('Categories', () => {
  test('are validated, editable, loop-free and protected from deletion while in use', async () => {
    const { user: manager } = await createUser({ role: 'course_manager' });
    const { user: instructor } = await createUser({ role: 'instructor' });

    expect((await api('post', '/course-categories', manager).send({})).status).toBe(400);

    const parent = await api('post', '/course-categories', manager).send({ name: `Parent ${Date.now()}` });
    expect(parent.status).toBe(201);
    const child = await api('post', '/course-categories', manager).send({ name: `Child ${Date.now()}`, parentCategory: parent.body.data._id });
    expect(child.status).toBe(201);
    expect((await api('post', '/course-categories', manager).send({ name: 'Orphan', parentCategory: '5f0000000000000000000000' })).status).toBe(400);

    const renamed = await api('patch', `/course-categories/${child.body.data._id}`, manager).send({ name: 'Renamed child' });
    expect(renamed.status).toBe(200);
    expect(renamed.body.data.name).toBe('Renamed child');

    const loop = await api('patch', `/course-categories/${parent.body.data._id}`, manager).send({ parentCategory: child.body.data._id });
    expect(loop.status).toBe(400);

    expect((await api('delete', `/course-categories/${parent.body.data._id}`, manager)).status).toBe(409);

    const res = await api('post', '/courses', instructor).send({ title: `Uses category ${Date.now()}`, category: child.body.data._id, price: 0 });
    expect(res.status).toBe(201);
    expect((await api('delete', `/course-categories/${child.body.data._id}`, manager)).status).toBe(409);

    await Course.deleteOne({ _id: res.body.data._id });
    expect((await api('delete', `/course-categories/${child.body.data._id}`, manager)).status).toBe(200);
    expect((await api('delete', `/course-categories/${parent.body.data._id}`, manager)).status).toBe(200);
  });
});

describe('Coupons and reminders', () => {
  test('a coupon with one redemption left cannot be used twice, and a failed enrollment gives the redemption back', async () => {
    const couponsService = require('../src/modules/coupons/coupons.service');
    const Coupon = require('../src/models/Coupon.model');
    const { user: manager } = await createUser({ role: 'course_manager' });
    const created = await api('post', '/coupons', manager).send({
      code: `ONEUSE${Date.now()}`,
      discountType: 'percentage',
      discountValue: 50,
      maxRedemptions: 1,
    });
    expect(created.status).toBe(201);
    const coupon = await Coupon.findById(created.body.data._id);

    await couponsService.reserveRedemption(coupon);
    await expect(couponsService.reserveRedemption(coupon)).rejects.toThrow(/redemption limit/);
    expect((await Coupon.findById(coupon._id)).redeemedCount).toBe(1);

    await couponsService.releaseRedemption(coupon._id);
    expect((await Coupon.findById(coupon._id)).redeemedCount).toBe(0);
    await couponsService.reserveRedemption(coupon);
    expect((await Coupon.findById(coupon._id)).redeemedCount).toBe(1);
  });

  test('a coupon with one redemption left goes to only one of two students who enroll after each other', async () => {
    const { user: instructor } = await createUser({ role: 'instructor' });
    const { user: manager } = await createUser({ role: 'course_manager' });
    const { user: first } = await createUser({ role: 'student' });
    const { user: second } = await createUser({ role: 'student' });
    const courseId = await newCourse(instructor, { price: 100 });
    const coupon = await api('post', '/coupons', manager).send({
      code: `SEQ${Date.now()}`,
      discountType: 'percentage',
      discountValue: 50,
      maxRedemptions: 1,
    });

    const one = await api('post', '/enrollments', first).send({ courseId, couponCode: coupon.body.data.code });
    const two = await api('post', '/enrollments', second).send({ courseId, couponCode: coupon.body.data.code });
    expect(one.status).toBe(201);
    expect(one.body.data.pricePaid).toBe(50);
    expect(two.status).toBe(400);
    expect(await Enrollment.countDocuments({ course: courseId })).toBe(1);
  });

  test('a deadline reminder is sent once per student, not every hour', async () => {
    const { user: instructor } = await createUser({ role: 'instructor' });
    const { user: student } = await createUser({ role: 'student' });
    const courseId = await newCourse(instructor);
    await api('post', '/enrollments', student).send({ courseId });

    const soon = new Date(Date.now() + 6 * 60 * 60 * 1000);
    await api('post', '/assessments', instructor).send({
      course: courseId,
      title: 'Due soon',
      assessmentType: 'project',
      evaluationType: 'manual',
      instructions: 'Hand it in',
      maxScore: 10,
      isPublished: true,
      dueDate: soon.toISOString(),
    });

    expect(await scanForUpcomingDeadlines()).toBe(1);
    expect(await scanForUpcomingDeadlines()).toBe(0);
    expect(await Notification.countDocuments({ user: student._id, type: 'assignment_deadline' })).toBe(1);
  });
});
