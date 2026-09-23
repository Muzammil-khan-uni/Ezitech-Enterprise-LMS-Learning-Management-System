const request = require('supertest');
const app = require('../src/app');
const coursesService = require('../src/modules/courses/courses.service');
const { Lesson } = require('../src/models/Lesson.model');
const Section = require('../src/models/Section.model');
const { createUser, createCategory, authHeader, addMinimumContent } = require('./helpers/factories');

const api = (method, url, user) => {
  const req = request(app)[method](`/api/v1${url}`);
  return user ? req.set('Authorization', authHeader(user)) : req;
};

async function publishedCourse(instructor, { publish = true } = {}) {
  const category = await createCategory();
  const res = await api('post', '/courses', instructor).send({
    title: `Course ${Date.now()}-${Math.random().toString(16).slice(2, 6)}`,
    category: category._id.toString(),
    price: 0,
  });
  const courseId = res.body.data._id;
  await addMinimumContent(courseId, instructor);
  if (publish) await api('patch', `/courses/${courseId}/status`, instructor).send({ status: 'published' });
  return courseId;
}

async function assignMentor(courseId, manager, mentor) {
  return api('put', `/courses/${courseId}/mentors`, manager).send({ mentorIds: [mentor._id.toString()] });
}

async function enroll(student, courseId) {
  return api('post', '/enrollments', student).send({ courseId });
}

describe('Mentor assignment', () => {
  test('only admins and course managers can assign mentors, and only to real, active mentors', async () => {
    const { user: owner } = await createUser({ role: 'instructor' });
    const { user: manager } = await createUser({ role: 'course_manager' });
    const { user: mentor } = await createUser({ role: 'mentor' });
    const { user: student } = await createUser({ role: 'student' });
    const courseId = await publishedCourse(owner);

    expect((await assignMentor(courseId, owner, mentor)).status).toBe(403);
    expect((await api('put', `/courses/${courseId}/mentors`, manager).send({ mentorIds: [student._id.toString()] })).status).toBe(400);

    const ok = await assignMentor(courseId, manager, mentor);
    expect(ok.status).toBe(200);
    expect(ok.body.data.map((m) => m.email)).toEqual([mentor.email]);

    const listed = await api('get', `/courses/${courseId}/mentors`, owner);
    expect(listed.status).toBe(200);
    expect(listed.body.data).toHaveLength(1);

    const { user: otherInstructor } = await createUser({ role: 'instructor' });
    expect((await api('get', `/courses/${courseId}/mentors`, otherInstructor)).status).toBe(403);
  });

  test('the mentor list never leaks through ordinary course responses', async () => {
    const { user: owner } = await createUser({ role: 'instructor' });
    const { user: manager } = await createUser({ role: 'course_manager' });
    const { user: mentor } = await createUser({ role: 'mentor' });
    const courseId = await publishedCourse(owner);
    await assignMentor(courseId, manager, mentor);

    const asAnyone = await api('get', `/courses/${courseId}`);
    expect(asAnyone.body.data.mentors).toBeUndefined();
    const asOwner = await api('get', `/courses/${courseId}`, owner);
    expect(asOwner.body.data.mentors).toBeUndefined();
  });

  test('the mentor picker is limited to admins and course managers', async () => {
    const { user: manager } = await createUser({ role: 'course_manager' });
    const { user: instructor } = await createUser({ role: 'instructor' });
    await createUser({ role: 'mentor' });

    const ok = await api('get', '/users/mentors', manager);
    expect(ok.status).toBe(200);
    expect(ok.body.data.length).toBeGreaterThan(0);
    expect((await api('get', '/users/mentors', instructor)).status).toBe(403);
  });
});

describe('Who can see a course\'s students', () => {
  test('owner, assigned mentor, course manager and admin can; other instructors, unassigned mentors and students cannot', async () => {
    const { user: owner } = await createUser({ role: 'instructor' });
    const { user: other } = await createUser({ role: 'instructor' });
    const { user: manager } = await createUser({ role: 'course_manager' });
    const { user: admin } = await createUser({ role: 'admin' });
    const { user: mentor } = await createUser({ role: 'mentor' });
    const { user: strayMentor } = await createUser({ role: 'mentor' });
    const { user: student } = await createUser({ role: 'student' });
    const courseId = await publishedCourse(owner);
    await enroll(student, courseId);
    await assignMentor(courseId, manager, mentor);

    for (const allowed of [owner, mentor, manager, admin]) {
      const res = await api('get', `/enrollments/courses/${courseId}`, allowed);
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
    }
    for (const denied of [other, strayMentor, student]) {
      const res = await api('get', `/enrollments/courses/${courseId}`, denied);
      expect(res.status).toBe(403);
    }
  });
});

describe('Course content boundaries', () => {
  test('deleting a section can never touch lessons that belong to another course', async () => {
    const { user: victim } = await createUser({ role: 'instructor' });
    const { user: attacker } = await createUser({ role: 'instructor' });
    const victimCourse = await publishedCourse(victim);
    const attackerCourse = await publishedCourse(attacker);
    const victimSection = await Section.findOne({ course: victimCourse });
    const before = await Lesson.countDocuments({ course: victimCourse });
    expect(before).toBeGreaterThan(0);

    const res = await api('delete', `/courses/${attackerCourse}/sections/${victimSection._id}`, attacker);
    expect(res.status).toBe(404);
    expect(await Lesson.countDocuments({ course: victimCourse })).toBe(before);
    expect(await Section.exists({ _id: victimSection._id })).toBeTruthy();

    const own = await Section.findOne({ course: attackerCourse });
    const ok = await api('delete', `/courses/${attackerCourse}/sections/${own._id}`, attacker);
    expect(ok.status).toBe(200);
    expect(await Lesson.countDocuments({ course: attackerCourse })).toBe(0);
  });

  test('offline download is refused to other instructors, outsiders and everyone once a course is a draft', async () => {
    const { user: owner } = await createUser({ role: 'instructor' });
    const { user: other } = await createUser({ role: 'instructor' });
    const { user: outsider } = await createUser({ role: 'student' });
    const { user: student } = await createUser({ role: 'student' });
    const { user: strayMentor } = await createUser({ role: 'mentor' });
    const published = await publishedCourse(owner);
    const draft = await publishedCourse(owner, { publish: false });
    await enroll(student, published);

    for (const denied of [other, outsider, strayMentor]) {
      expect((await api('get', `/courses/${published}/offline-package`, denied)).status).toBe(403);
    }
    expect((await api('get', `/courses/${draft}/offline-package`, other)).status).toBe(403);

    await expect(coursesService.assertCanDownloadOffline(published, { id: student._id.toString(), role: 'student' })).resolves.toBeUndefined();
    await expect(coursesService.assertCanDownloadOffline(published, { id: owner._id.toString(), role: 'instructor' })).resolves.toBeUndefined();
    await expect(coursesService.assertCanDownloadOffline(draft, { id: owner._id.toString(), role: 'instructor' })).resolves.toBeUndefined();
    await expect(coursesService.assertCanDownloadOffline(draft, { id: student._id.toString(), role: 'student' })).rejects.toThrow();
  });

  test('a mentor only gets lesson content for courses they are assigned to', async () => {
    const { user: owner } = await createUser({ role: 'instructor' });
    const { user: manager } = await createUser({ role: 'course_manager' });
    const { user: mentor } = await createUser({ role: 'mentor' });
    const courseId = await publishedCourse(owner);

    const before = await api('get', `/courses/${courseId}/lessons`, mentor);
    expect(before.body.data[0].locked).toBe(true);
    expect(before.body.data[0].videoUrl).toBeUndefined();

    await assignMentor(courseId, manager, mentor);
    const after = await api('get', `/courses/${courseId}/lessons`, mentor);
    expect(after.body.data[0].locked).toBe(false);
    expect(after.body.data[0].videoUrl).toBeDefined();
  });
});

describe('Discussion moderation stays inside your own courses', () => {
  async function setup() {
    const { user: owner } = await createUser({ role: 'instructor' });
    const { user: other } = await createUser({ role: 'instructor' });
    const { user: manager } = await createUser({ role: 'course_manager' });
    const { user: mentor } = await createUser({ role: 'mentor' });
    const { user: strayMentor } = await createUser({ role: 'mentor' });
    const { user: student } = await createUser({ role: 'student' });
    const courseId = await publishedCourse(owner);
    await enroll(student, courseId);
    await assignMentor(courseId, manager, mentor);
    const thread = await api('post', `/discussions/courses/${courseId}/threads`, student).send({ title: 'Question', body: 'Help please' });
    return { owner, other, manager, mentor, strayMentor, student, courseId, threadId: thread.body.data._id };
  }

  test('another instructor cannot pin, lock or delete threads or comments in your course', async () => {
    const { owner, other, student, threadId } = await setup();
    const comment = await api('post', `/discussions/threads/${threadId}/comments`, student).send({ body: 'A follow-up' });

    expect((await api('patch', `/discussions/threads/${threadId}`, other).send({ isPinned: true })).status).toBe(403);
    expect((await api('delete', `/discussions/comments/${comment.body.data._id}`, other)).status).toBe(403);
    expect((await api('delete', `/discussions/threads/${threadId}`, other)).status).toBe(403);

    expect((await api('patch', `/discussions/threads/${threadId}`, owner).send({ isPinned: true })).status).toBe(200);
    expect((await api('delete', `/discussions/comments/${comment.body.data._id}`, owner)).status).toBe(200);
  });

  test('only the course\'s own instructor or staff can post announcements', async () => {
    const { owner, manager, student, courseId } = await setup();
    const { user: enrolledInstructor } = await createUser({ role: 'instructor' });
    await enroll(enrolledInstructor, courseId);

    const body = { title: 'Big news', body: 'Read this', isAnnouncement: true };
    expect((await api('post', `/discussions/courses/${courseId}/threads`, enrolledInstructor).send(body)).status).toBe(403);
    expect((await api('post', `/discussions/courses/${courseId}/threads`, student).send(body)).status).toBe(403);
    expect((await api('post', `/discussions/courses/${courseId}/threads`, owner).send(body)).status).toBe(201);
    expect((await api('post', `/discussions/courses/${courseId}/threads`, manager).send(body)).status).toBe(201);
  });

  test('an assigned mentor can read and reply, an unassigned mentor cannot enter', async () => {
    const { mentor, strayMentor, courseId, threadId } = await setup();

    expect((await api('get', `/discussions/courses/${courseId}/threads`, strayMentor)).status).toBe(403);
    expect((await api('post', `/discussions/threads/${threadId}/comments`, strayMentor).send({ body: 'hi' })).status).toBe(403);

    const reply = await api('post', `/discussions/threads/${threadId}/comments`, mentor).send({ body: 'Try this approach' });
    expect(reply.status).toBe(201);
    expect(reply.body.data.isInstructorReply).toBe(true);
    expect((await api('patch', `/discussions/threads/${threadId}`, mentor).send({ isLocked: true })).status).toBe(403);
  });

  test('replies and lesson links must belong to the same thread and course', async () => {
    const { owner, student, courseId, threadId } = await setup();
    const otherThread = await api('post', `/discussions/courses/${courseId}/threads`, student).send({ title: 'Second', body: 'Another question' });
    const foreignComment = await api('post', `/discussions/threads/${otherThread.body.data._id}/comments`, student).send({ body: 'On the other thread' });

    const crossThread = await api('post', `/discussions/threads/${threadId}/comments`, student).send({
      body: 'Reply to the wrong thread',
      parentComment: foreignComment.body.data._id,
    });
    expect(crossThread.status).toBe(400);

    const { user: otherOwner } = await createUser({ role: 'instructor' });
    const otherCourse = await publishedCourse(otherOwner);
    const foreignLesson = await Lesson.findOne({ course: otherCourse });
    const badLesson = await api('post', `/discussions/courses/${courseId}/threads`, owner).send({
      title: 'Bad link',
      body: 'Linked to a lesson elsewhere',
      lesson: foreignLesson._id.toString(),
    });
    expect(badLesson.status).toBe(400);
  });
});

describe('Assessments and grading stay inside your own courses', () => {
  async function quizCourse() {
    const { user: owner } = await createUser({ role: 'instructor' });
    const { user: manager } = await createUser({ role: 'course_manager' });
    const { user: mentor } = await createUser({ role: 'mentor' });
    const { user: strayMentor } = await createUser({ role: 'mentor' });
    const { user: student } = await createUser({ role: 'student' });
    const courseId = await publishedCourse(owner);
    await enroll(student, courseId);
    await assignMentor(courseId, manager, mentor);

    const published = await api('post', '/assessments', owner).send({
      course: courseId,
      title: 'Published quiz',
      assessmentType: 'quiz',
      evaluationType: 'auto',
      isPublished: true,
      questions: [{ questionText: 'Pick one', options: [{ text: 'A', isCorrect: true }, { text: 'B', isCorrect: false }] }],
    });
    const draft = await api('post', '/assessments', owner).send({
      course: courseId,
      title: 'Draft quiz',
      assessmentType: 'quiz',
      evaluationType: 'auto',
      isPublished: false,
      questions: [{ questionText: 'Pick one', options: [{ text: 'A', isCorrect: true }, { text: 'B', isCorrect: false }] }],
    });
    const project = await api('post', '/assessments', owner).send({
      course: courseId,
      title: 'Project',
      assessmentType: 'project',
      evaluationType: 'manual',
      instructions: 'Build something',
      isPublished: true,
    });
    return {
      owner, manager, mentor, strayMentor, student, courseId,
      quizId: published.body.data._id, draftId: draft.body.data._id, projectId: project.body.data._id,
    };
  }

  test('an instructor who is only enrolled as a learner never sees answers or unpublished quizzes', async () => {
    const { owner, courseId, quizId, draftId } = await quizCourse();
    const { user: instructorLearner } = await createUser({ role: 'instructor' });
    await enroll(instructorLearner, courseId);

    const asLearner = await api('get', `/assessments/${quizId}`, instructorLearner);
    expect(asLearner.status).toBe(200);
    expect(asLearner.body.data.questions[0].options[0].isCorrect).toBeUndefined();
    expect((await api('get', `/assessments/${draftId}`, instructorLearner)).status).toBe(404);

    const list = await api('get', `/assessments/course/${courseId}`, instructorLearner);
    expect(list.body.data.map((a) => a.title).sort()).toEqual(['Project', 'Published quiz']);

    const asOwner = await api('get', `/assessments/${quizId}`, owner);
    expect(asOwner.body.data.questions[0].options[0].isCorrect).toBe(true);
    expect((await api('get', `/assessments/${draftId}`, owner)).status).toBe(200);
  });

  test('another instructor cannot open a course\'s assessments at all', async () => {
    const { quizId, courseId } = await quizCourse();
    const { user: other } = await createUser({ role: 'instructor' });
    expect((await api('get', `/assessments/${quizId}`, other)).status).toBe(403);
    expect((await api('get', `/assessments/course/${courseId}`, other)).status).toBe(403);
  });

  test('grading is limited to the course\'s instructor, its assigned mentors and staff', async () => {
    const { owner, manager, mentor, strayMentor, student, projectId } = await quizCourse();
    const { user: other } = await createUser({ role: 'instructor' });

    const attempt = await api('post', `/assessments/${projectId}/attempts`, student).send();
    expect(attempt.status).toBe(201);
    const submissionId = attempt.body.data.submission._id;
    const submitted = await api('post', `/assessments/attempts/${submissionId}/submit`, student).send({
      fileUrl: 'https://example.com/my-project.zip',
    });
    expect(submitted.status).toBe(200);

    for (const denied of [strayMentor, other]) {
      expect((await api('get', `/assessments/${projectId}/submissions`, denied)).status).toBe(403);
      expect(
        (await api('patch', `/assessments/submissions/${submissionId}/grade`, denied).send({ score: 90, feedback: 'ok' })).status
      ).toBe(403);
    }
    for (const allowed of [owner, mentor, manager]) {
      expect((await api('get', `/assessments/${projectId}/submissions`, allowed)).status).toBe(200);
    }
    expect(
      (await api('patch', `/assessments/submissions/${submissionId}/grade`, mentor).send({ score: 90, feedback: 'Nice work' })).status
    ).toBe(200);
  });
});

describe('Live classes and attendance stay inside your own courses', () => {
  test('sessions, join rights and attendance follow the same boundaries', async () => {
    const { user: owner } = await createUser({ role: 'instructor' });
    const { user: manager } = await createUser({ role: 'course_manager' });
    const { user: mentor } = await createUser({ role: 'mentor' });
    const { user: strayMentor } = await createUser({ role: 'mentor' });
    const { user: student } = await createUser({ role: 'student' });
    const { user: outsider } = await createUser({ role: 'student' });
    const courseId = await publishedCourse(owner);
    await enroll(student, courseId);
    await assignMentor(courseId, manager, mentor);

    const scheduled = await api('post', `/live-classes/courses/${courseId}`, owner).send({
      title: 'Kickoff',
      scheduledAt: new Date(Date.now() + 3600 * 1000).toISOString(),
    });
    expect(scheduled.status).toBe(201);
    const sessionId = scheduled.body.data._id;

    for (const allowed of [student, mentor, owner, manager]) {
      expect((await api('get', `/live-classes/courses/${courseId}`, allowed)).status).toBe(200);
      expect((await api('get', `/live-classes/${sessionId}`, allowed)).status).toBe(200);
    }
    for (const denied of [outsider, strayMentor]) {
      expect((await api('get', `/live-classes/courses/${courseId}`, denied)).status).toBe(403);
      expect((await api('get', `/live-classes/${sessionId}`, denied)).status).toBe(403);
    }

    expect((await api('get', `/attendance/live-classes/${sessionId}`, mentor)).status).toBe(200);
    expect((await api('get', `/attendance/live-classes/${sessionId}`, strayMentor)).status).toBe(403);
    expect((await api('get', `/attendance/live-classes/${sessionId}`, student)).status).toBe(403);
  });
});

describe('Mentor workspace', () => {
  test('the mentor dashboard shows only assigned courses and is closed to other roles', async () => {
    const { user: owner } = await createUser({ role: 'instructor' });
    const { user: manager } = await createUser({ role: 'course_manager' });
    const { user: mentor } = await createUser({ role: 'mentor' });
    const { user: student } = await createUser({ role: 'student' });
    const assigned = await publishedCourse(owner);
    await publishedCourse(owner);
    await enroll(student, assigned);
    await assignMentor(assigned, manager, mentor);

    const res = await api('get', '/analytics/mentor', mentor);
    expect(res.status).toBe(200);
    expect(res.body.data.courses).toHaveLength(1);
    expect(res.body.data.courses[0]._id).toBe(assigned);
    expect(res.body.data.courses[0].students).toBe(1);
    expect(res.body.data.totals.courses).toBe(1);

    const { user: fresh } = await createUser({ role: 'mentor' });
    const empty = await api('get', '/analytics/mentor', fresh);
    expect(empty.body.data.courses).toEqual([]);

    expect((await api('get', '/analytics/mentor', owner)).status).toBe(403);
    expect((await api('get', '/analytics/mentor', student)).status).toBe(403);
  });
});
