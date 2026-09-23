const Progress = require('../../models/Progress.model');
const { Assessment } = require('../../models/Assessment.model');
const { Submission } = require('../../models/Submission.model');
const { Lesson } = require('../../models/Lesson.model');
const { Enrollment } = require('../../models/Enrollment.model');
const ApiError = require('../../utils/ApiError');
const logger = require('../../utils/logger');
const certificatesService = require('../certificates/certificates.service');
const learningPathsService = require('../learning-paths/learning-paths.service');

const VIDEO_WATCH_FRACTION = 0.85;
const MAX_PLAYBACK_SPEED = 2.25;
const REPORT_GAP_CAP_SECONDS = 120;
const REPORT_GRACE_SECONDS = 5;

async function passedAssessmentIds(studentId, assessmentIds) {
  if (assessmentIds.length === 0) return [];
  return Submission.distinct('assessment', {
    student: studentId,
    assessment: { $in: assessmentIds },
    passed: true,
  });
}

async function recomputeEnrollmentProgress(studentId, courseId) {
  const enrollment = await Enrollment.findOne({ student: studentId, course: courseId });
  if (!enrollment) return 0;

  const [totalLessons, completedLessons, assessments] = await Promise.all([
    Lesson.countDocuments({ course: courseId }),
    Progress.countDocuments({ student: studentId, course: courseId, isCompleted: true }),
    Assessment.find({ course: courseId, isPublished: true }).select('_id').lean(),
  ]);
  const passed = await passedAssessmentIds(
    studentId,
    assessments.map((assessment) => assessment._id)
  );

  const totalItems = totalLessons + assessments.length;
  const doneItems = Math.min(completedLessons, totalLessons) + passed.length;
  const percent = totalItems === 0 ? 0 : Math.round((doneItems / totalItems) * 100);

  const update = { progressPercent: percent, lastAccessedAt: new Date() };
  const justCompleted = percent === 100 && enrollment.status !== 'completed' && enrollment.status !== 'dropped';
  if (justCompleted) {
    update.status = 'completed';
    update.completedAt = new Date();
  }

  await Enrollment.updateOne({ _id: enrollment._id }, { $set: update });

  if (justCompleted) {
    await certificatesService.issueCertificate(studentId, courseId);
    await learningPathsService.checkPathAdvancement(studentId, courseId).catch((err) => {
      logger.error('checkPathAdvancement failed', { err, studentId, courseId });
    });
  }

  return percent;
}

async function assertLessonCanBeCompleted(studentId, lesson) {
  if (lesson.lessonType === 'scorm') {
    throw ApiError.badRequest('This lesson is completed inside its interactive player');
  }

  if (lesson.lessonType === 'video' && lesson.durationSeconds > 0) {
    const progress = await Progress.findOne({ student: studentId, lesson: lesson._id }).select('watchedSeconds');
    const watched = progress ? progress.watchedSeconds || 0 : 0;
    if (watched < lesson.durationSeconds * VIDEO_WATCH_FRACTION) {
      throw ApiError.badRequest('Watch most of this video to complete the lesson');
    }
  }

  const linked = await Assessment.find({ course: lesson.course, lesson: lesson._id, isPublished: true })
    .select('_id')
    .lean();
  if (linked.length > 0) {
    const passed = await passedAssessmentIds(
      studentId,
      linked.map((assessment) => assessment._id)
    );
    if (passed.length < linked.length) {
      throw ApiError.badRequest('Pass the assessment linked to this lesson to complete it');
    }
  }
}

async function markLessonComplete(studentId, courseId, lessonId, { verified = false } = {}) {
  const lesson = await Lesson.findOne({ _id: lessonId, course: courseId });
  if (!lesson) throw ApiError.notFound('Lesson not found in this course');

  const enrollment = await Enrollment.findOne({ student: studentId, course: courseId });
  if (!enrollment || enrollment.status === 'dropped') {
    throw ApiError.forbidden('You must be enrolled in this course to track progress');
  }

  if (lesson.prerequisiteLessons && lesson.prerequisiteLessons.length > 0) {
    const doneCount = await Progress.countDocuments({
      student: studentId,
      lesson: { $in: lesson.prerequisiteLessons },
      isCompleted: true,
    });
    if (doneCount < lesson.prerequisiteLessons.length) {
      throw ApiError.badRequest('Complete the prerequisite lessons first');
    }
  }

  if (!verified) {
    await assertLessonCanBeCompleted(studentId, lesson);
  }

  await Progress.findOneAndUpdate(
    { student: studentId, lesson: lessonId },
    {
      student: studentId,
      course: courseId,
      lesson: lessonId,
      section: lesson.section,
      isCompleted: true,
      completedAt: new Date(),
    },
    { upsert: true, new: true }
  );

  const percent = await recomputeEnrollmentProgress(studentId, courseId);
  return { lessonId, percent };
}

async function markLessonIncomplete(studentId, courseId, lessonId) {
  const lesson = await Lesson.findOne({ _id: lessonId, course: courseId }).select('_id');
  if (!lesson) throw ApiError.notFound('Lesson not found in this course');

  const enrollment = await Enrollment.findOne({ student: studentId, course: courseId });
  if (!enrollment || enrollment.status === 'dropped') {
    throw ApiError.forbidden('You must be enrolled in this course to track progress');
  }

  await Progress.updateOne({ student: studentId, lesson: lessonId }, { isCompleted: false, completedAt: null });
  const percent = await recomputeEnrollmentProgress(studentId, courseId);
  return { lessonId, percent };
}

async function getCourseProgress(studentId, courseId) {
  const records = await Progress.find({ student: studentId, course: courseId });
  const enrollment = await Enrollment.findOne({ student: studentId, course: courseId });
  return { progressPercent: enrollment?.progressPercent ?? 0, lessons: records };
}

async function updateVideoPosition(studentId, courseId, lessonId, reportedPosition) {
  const lesson = await Lesson.findOne({ _id: lessonId, course: courseId });
  if (!lesson || lesson.lessonType !== 'video') {
    throw ApiError.badRequest('This lesson is not a video lesson');
  }

  const enrollment = await Enrollment.findOne({ student: studentId, course: courseId });
  if (!enrollment || enrollment.status === 'dropped') {
    throw ApiError.forbidden('You must be enrolled in this course to track progress');
  }

  const duration = lesson.durationSeconds || 0;
  const position = duration > 0 ? Math.min(reportedPosition, duration) : reportedPosition;
  const existing = await Progress.findOne({ student: studentId, lesson: lessonId });
  const alreadyCompleted = existing?.isCompleted || false;

  const now = new Date();
  let credit = 0;
  let elapsed = 0;
  if (existing && existing.lastReportAt) {
    elapsed = Math.min((now - existing.lastReportAt) / 1000, REPORT_GAP_CAP_SECONDS);
    const advanced = position - (existing.lastPositionSeconds || 0);
    credit = Math.max(0, Math.min(advanced, elapsed * MAX_PLAYBACK_SPEED + REPORT_GRACE_SECONDS));
  }

  const previousWatched = existing?.watchedSeconds || 0;
  const watchedSeconds = duration > 0 ? Math.min(duration, previousWatched + credit) : previousWatched + credit;

  await Progress.findOneAndUpdate(
    { student: studentId, lesson: lessonId },
    {
      student: studentId,
      course: courseId,
      lesson: lessonId,
      section: lesson.section,
      lastPositionSeconds: position,
      lastReportAt: now,
      watchedSeconds,
      timeSpentSeconds: (existing?.timeSpentSeconds || 0) + elapsed,
    },
    { upsert: true, new: true }
  );

  if (!alreadyCompleted && duration > 0 && watchedSeconds >= duration * VIDEO_WATCH_FRACTION) {
    return markLessonComplete(studentId, courseId, lessonId, { verified: true });
  }

  const percent = await recomputeEnrollmentProgress(studentId, courseId);
  return { lessonId, percent, completed: alreadyCompleted };
}

async function getVideoPosition(studentId, lessonId) {
  const progress = await Progress.findOne({ student: studentId, lesson: lessonId }).select(
    'lastPositionSeconds isCompleted'
  );
  return { lastPositionSeconds: progress?.lastPositionSeconds || 0, isCompleted: progress?.isCompleted || false };
}

module.exports = {
  markLessonComplete,
  markLessonIncomplete,
  getCourseProgress,
  recomputeEnrollmentProgress,
  updateVideoPosition,
  getVideoPosition,
};
