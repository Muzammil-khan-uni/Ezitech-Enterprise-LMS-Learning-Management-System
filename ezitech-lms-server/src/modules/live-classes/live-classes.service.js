const { LiveSession } = require('../../models/LiveSession.model');
const { Course } = require('../../models/Course.model');
const { Enrollment } = require('../../models/Enrollment.model');
const ApiError = require('../../utils/ApiError');
const notificationsService = require('../notifications/notifications.service');
const courseAccess = require('../../utils/courseAccess');

async function assertCanManage(course, reqUser) {
  const isOwner = course.instructor.toString() === reqUser.id;
  if (!isOwner && !['admin', 'course_manager'].includes(reqUser.role)) {
    throw ApiError.forbidden('You do not have permission to manage live sessions for this course');
  }
}

async function scheduleSession(courseId, data, reqUser) {
  const course = await Course.findById(courseId);
  if (!course) throw ApiError.notFound('Course not found');
  await assertCanManage(course, reqUser);

  const session = await LiveSession.create({
    course: courseId,
    instructor: reqUser.id,
    title: data.title,
    description: data.description,
    scheduledAt: data.scheduledAt,
  });

  await notificationsService.notifyEnrolledStudents(courseId, {
    type: 'announcement',
    title: `Live class scheduled: ${session.title}`,
    message: `Join at ${session.scheduledAt.toLocaleString()}`,
    relatedEntityType: 'liveSession',
    relatedEntityId: session._id,
  });

  return session;
}

async function listSessionsForCourse(courseId, reqUser) {
  const access = await courseAccess.getAccess(courseId, reqUser);
  if (!access.canModerate && !(await courseAccess.isEnrolled(courseId, reqUser))) {
    throw ApiError.forbidden('You must be enrolled in this course to see its live classes');
  }
  return LiveSession.find({ course: courseId, status: { $ne: 'cancelled' } }).sort('scheduledAt');
}

async function getSession(sessionId) {
  const session = await LiveSession.findById(sessionId).populate('course', 'title').populate('instructor', 'name');
  if (!session) throw ApiError.notFound('Live session not found');
  return session;
}

async function assertCanJoin(session, reqUser) {
  const isInstructor = session.instructor._id.toString() === reqUser.id;
  if (isInstructor) return;
  const access = await courseAccess.getAccess(session.course._id, reqUser);
  if (access.canModerate) return;

  const enrollment = await Enrollment.findOne({
    student: reqUser.id,
    course: session.course._id,
    status: { $ne: 'dropped' },
  });
  if (!enrollment) throw ApiError.forbidden('You must be enrolled in this course to join its live class');
}

async function startSession(sessionId, reqUser) {
  const session = await LiveSession.findById(sessionId).populate('course', 'instructor');
  if (!session) throw ApiError.notFound('Live session not found');

  const course = await Course.findById(session.course._id);
  await assertCanManage(course, reqUser);

  session.status = 'live';
  session.startedAt = new Date();
  await session.save();
  return session;
}

async function endSession(sessionId, reqUser) {
  const session = await LiveSession.findById(sessionId).populate('course', 'instructor');
  if (!session) throw ApiError.notFound('Live session not found');

  const course = await Course.findById(session.course._id);
  await assertCanManage(course, reqUser);

  session.status = 'ended';
  session.endedAt = new Date();
  await session.save();
  return session;
}

module.exports = {
  scheduleSession,
  listSessionsForCourse,
  getSession,
  assertCanJoin,
  startSession,
  endSession,
};
