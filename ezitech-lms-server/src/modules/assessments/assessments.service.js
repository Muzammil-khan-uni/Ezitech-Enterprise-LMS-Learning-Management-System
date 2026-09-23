const { Assessment } = require('../../models/Assessment.model');
const { Submission } = require('../../models/Submission.model');
const { Enrollment } = require('../../models/Enrollment.model');
const { Course } = require('../../models/Course.model');
const ApiError = require('../../utils/ApiError');
const notificationsService = require('../notifications/notifications.service');
const courseAccess = require('../../utils/courseAccess');
const logger = require('../../utils/logger');

const PRIVILEGED_ROLES = ['admin', 'course_manager'];

async function assertCanManageCourse(courseId, reqUser) {
  const course = await Course.findById(courseId).select('instructor');
  if (!course) throw ApiError.notFound('Course not found');

  const isOwner = course.instructor.toString() === reqUser.id;
  if (!isOwner && !PRIVILEGED_ROLES.includes(reqUser.role)) {
    throw ApiError.forbidden('You do not have permission to manage assessments for this course');
  }
  return course;
}

async function assertCanGradeCourse(courseId, reqUser) {
  await courseAccess.assertCanModerate(
    courseId,
    reqUser,
    'You can only grade submissions for courses you teach or mentor'
  );
}

async function assertCanViewCourseAssessments(courseId, reqUser) {
  const access = await courseAccess.getAccess(courseId, reqUser);
  if (access.canModerate) return access;

  const enrolled = await Enrollment.exists({
    student: reqUser.id,
    course: courseId,
    status: { $ne: 'dropped' },
  });
  if (!enrolled) {
    throw ApiError.forbidden('You must be enrolled in this course to view its assessments');
  }
  return access;
}

async function notifyQuizPublished(assessment) {
  const course = await Course.findById(assessment.course).select('title');
  await notificationsService.notifyEnrolledStudents(assessment.course, {
    type: 'quiz_alert',
    title: `New quiz available: ${assessment.title}`,
    message: `A new quiz is ready in ${course?.title || 'your course'}${
      assessment.timeLimitMinutes ? ` (${assessment.timeLimitMinutes} min time limit)` : ''
    }.`,
    relatedEntityType: 'assessment',
    relatedEntityId: assessment._id,
  });
}

async function createAssessment(data, reqUser) {
  await assertCanManageCourse(data.course, reqUser);

  const assessment = await Assessment.create({ ...data, createdBy: reqUser.id });
  if (assessment.assessmentType === 'quiz' && assessment.isPublished) {
    await notifyQuizPublished(assessment);
  }
  return assessment;
}

async function getAssessment(assessmentId, { forStudent = false } = {}) {
  const assessment = await Assessment.findById(assessmentId);
  if (!assessment) throw ApiError.notFound('Assessment not found');
  if (forStudent && !assessment.isPublished) {
    throw ApiError.notFound('Assessment not found');
  }
  return assessment;
}

function sanitizeForStudent(assessment) {
  const obj = assessment.toObject();
  if (obj.assessmentType === 'quiz') {
    obj.questions = obj.questions.map((q) => ({
      _id: q._id,
      questionText: q.questionText,
      type: q.type,
      points: q.points,
      options: q.options.map((o) => ({ _id: o._id, text: o.text })),
    }));
  }
  return obj;
}

async function getAssessmentForUser(assessmentId, reqUser) {
  const assessment = await Assessment.findById(assessmentId);
  if (!assessment) throw ApiError.notFound('Assessment not found');

  const access = await assertCanViewCourseAssessments(assessment.course, reqUser);
  if (access.canManage) return assessment;
  if (!assessment.isPublished) throw ApiError.notFound('Assessment not found');
  return sanitizeForStudent(assessment);
}

async function listAssessmentsForUser(courseId, reqUser) {
  const access = await assertCanViewCourseAssessments(courseId, reqUser);
  return listAssessmentsForCourse(courseId, { forStudent: !access.canManage });
}

async function listAssessmentsForCourse(courseId, { forStudent = false } = {}) {
  const filter = forStudent ? { course: courseId, isPublished: true } : { course: courseId };
  const assessments = await Assessment.find(filter).sort('-createdAt');
  return forStudent ? assessments.map(sanitizeForStudent) : assessments;
}

async function updateAssessment(assessmentId, updates, reqUser) {
  const assessment = await Assessment.findById(assessmentId);
  if (!assessment) throw ApiError.notFound('Assessment not found');
  await assertCanManageCourse(assessment.course, reqUser);

  const wasPublished = assessment.isPublished;
  const { assessmentType: _assessmentType, course: _course, ...changes } = updates;
  assessment.set(changes);
  await assessment.save();

  const justPublished = !wasPublished && assessment.isPublished;
  if (justPublished && assessment.assessmentType === 'quiz') {
    await notifyQuizPublished(assessment);
  }

  return assessment;
}

async function deleteAssessment(assessmentId, reqUser) {
  const assessment = await Assessment.findById(assessmentId).select('course');
  if (!assessment) throw ApiError.notFound('Assessment not found');
  await assertCanManageCourse(assessment.course, reqUser);

  await Assessment.deleteOne({ _id: assessmentId });
  await Submission.deleteMany({ assessment: assessmentId });
}

async function assertEnrolled(studentId, courseId) {
  const enrollment = await Enrollment.findOne({ student: studentId, course: courseId, status: { $ne: 'dropped' } });
  if (!enrollment) throw ApiError.forbidden('You must be enrolled in this course to attempt its assessments');
}

async function startAttempt(assessmentId, studentId) {
  const assessment = await Assessment.findById(assessmentId);
  if (!assessment) throw ApiError.notFound('Assessment not found');
  if (!assessment.isPublished) throw ApiError.badRequest('This assessment is not yet available');

  await assertEnrolled(studentId, assessment.course);

  const attemptCount = await Submission.countDocuments({ assessment: assessmentId, student: studentId });
  if (attemptCount >= assessment.maxAttempts) {
    throw ApiError.forbidden('No attempts remaining for this assessment');
  }

  if (assessment.dueDate && new Date() > assessment.dueDate) {
    throw ApiError.badRequest('The due date for this assessment has passed');
  }

  const submission = await Submission.create({
    assessment: assessmentId,
    student: studentId,
    attemptNumber: attemptCount + 1,
    startedAt: new Date(),
    status: 'in_progress',
  });

  return { submission, assessment: sanitizeForStudent(assessment) };
}

function gradeQuiz(quiz, quizAnswers) {
  let earned = 0;
  let total = 0;

  for (const question of quiz.questions) {
    total += question.points;
    const answer = quizAnswers.find((a) => a.questionId.toString() === question._id.toString());
    if (!answer) continue;

    const correctIndexes = question.options
      .map((opt, idx) => (opt.isCorrect ? idx : null))
      .filter((idx) => idx !== null)
      .sort();
    const selected = [...(answer.selectedOptionIndexes || [])].sort();

    const isExactMatch =
      correctIndexes.length === selected.length && correctIndexes.every((v, i) => v === selected[i]);

    if (isExactMatch) earned += question.points;
  }

  const percent = total === 0 ? 0 : Math.round((earned / total) * 100);
  return { earned, total, percent };
}

async function submitAttempt(submissionId, payload, studentId) {
  const submission = await Submission.findOne({ _id: submissionId, student: studentId });
  if (!submission) throw ApiError.notFound('Submission not found');
  if (submission.status !== 'in_progress') {
    throw ApiError.badRequest('This attempt has already been submitted');
  }

  const assessment = await Assessment.findById(submission.assessment);

  if (assessment.assessmentType === 'quiz' && assessment.timeLimitMinutes) {
    const deadline = new Date(submission.startedAt.getTime() + assessment.timeLimitMinutes * 60_000);
    if (new Date() > deadline) {
      throw ApiError.badRequest('Time limit exceeded for this attempt');
    }
  }

  submission.submittedAt = new Date();
  submission.timeTakenSeconds = Math.round((submission.submittedAt - submission.startedAt) / 1000);

  if (assessment.assessmentType === 'quiz') {
    submission.quizAnswers = payload.quizAnswers || [];
    const { earned, total, percent } = gradeQuiz(assessment, submission.quizAnswers);
    submission.score = earned;
    submission.maxScore = total;
    submission.passed = percent >= assessment.passingScorePercent;
    submission.status = 'auto_graded';
  } else if (assessment.assessmentType === 'coding_assignment') {
    submission.code = payload.code;
    submission.language = payload.language;
    submission.status = 'submitted';
  } else {
    submission.fileUrl = payload.fileUrl;
    submission.status = 'submitted';
  }

  await submission.save();

  if (submission.status === 'auto_graded') {
    await refreshProgressAfterGrading(studentId, assessment.course);
  }
  return submission;
}

async function refreshProgressAfterGrading(studentId, courseId) {
  const progressService = require('../progress/progress.service');
  await progressService.recomputeEnrollmentProgress(studentId, courseId).catch((err) => {
    logger.error('Could not refresh progress after grading', { err, studentId, courseId });
  });
}

async function gradeSubmission(submissionId, { score, feedback }, reqUser) {
  const submission = await Submission.findById(submissionId).populate('assessment');
  if (!submission) throw ApiError.notFound('Submission not found');
  await assertCanGradeCourse(submission.assessment.course, reqUser);

  if (submission.status === 'in_progress') {
    throw ApiError.badRequest('Cannot grade an attempt that has not been submitted yet');
  }

  const maxScore = submission.assessment.maxScore ?? submission.maxScore;
  if (maxScore != null && score > maxScore) {
    throw ApiError.badRequest(`Score cannot exceed the assessment maximum of ${maxScore}`);
  }

  submission.score = score;
  submission.maxScore = maxScore;
  submission.passed = (score / (maxScore || 100)) * 100 >= (submission.assessment.passingScorePercent ?? 50);
  submission.feedback = feedback;
  submission.gradedBy = reqUser.id;
  submission.gradedAt = new Date();
  submission.status = 'graded';
  await submission.save();

  await refreshProgressAfterGrading(submission.student, submission.assessment.course);
  return submission;
}

async function listMySubmissions(studentId, assessmentId) {
  return Submission.find({ student: studentId, assessment: assessmentId }).sort('-attemptNumber');
}

async function listSubmissionsForGrading(assessmentId, { pendingOnly = true } = {}, reqUser) {
  const assessment = await Assessment.findById(assessmentId).select('course');
  if (!assessment) throw ApiError.notFound('Assessment not found');
  await assertCanGradeCourse(assessment.course, reqUser);

  const filter = { assessment: assessmentId };
  if (pendingOnly) filter.status = 'submitted';
  return Submission.find(filter).populate('student', 'name email').sort('submittedAt');
}

module.exports = {
  assertCanViewCourseAssessments,
  createAssessment,
  getAssessment,
  getAssessmentForUser,
  listAssessmentsForUser,
  sanitizeForStudent,
  listAssessmentsForCourse,
  updateAssessment,
  deleteAssessment,
  startAttempt,
  submitAttempt,
  gradeSubmission,
  listMySubmissions,
  listSubmissionsForGrading,
};
