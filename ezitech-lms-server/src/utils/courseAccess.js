const { Course } = require('../models/Course.model');
const { Enrollment } = require('../models/Enrollment.model');
const ApiError = require('./ApiError');

const STAFF_ROLES = ['admin', 'course_manager'];

function isStaff(user) {
  return Boolean(user) && STAFF_ROLES.includes(user.role);
}

function isOwner(course, user) {
  return Boolean(user) && course.instructor.toString() === user.id;
}

async function isAssignedMentor(courseId, user) {
  if (!user || user.role !== 'mentor') return false;
  return Boolean(await Course.exists({ _id: courseId, mentors: user.id }));
}

async function isEnrolled(courseId, user) {
  if (!user) return false;
  return Boolean(
    await Enrollment.exists({ student: user.id, course: courseId, status: { $ne: 'dropped' } })
  );
}

async function getAccess(courseOrId, user) {
  const course =
    courseOrId && courseOrId.instructor
      ? courseOrId
      : await Course.findById(courseOrId).select('instructor status');
  if (!course) throw ApiError.notFound('Course not found');

  const canManage = isOwner(course, user) || isStaff(user);
  const mentor = canManage ? false : await isAssignedMentor(course._id, user);

  return { course, canManage, isMentor: mentor, canModerate: canManage || mentor };
}

async function assertCanManage(courseOrId, user, message = 'You do not have permission to manage this course') {
  const access = await getAccess(courseOrId, user);
  if (!access.canManage) throw ApiError.forbidden(message);
  return access;
}

async function assertCanModerate(courseOrId, user, message = 'You do not have access to this course') {
  const access = await getAccess(courseOrId, user);
  if (!access.canModerate) throw ApiError.forbidden(message);
  return access;
}

module.exports = {
  isStaff,
  isOwner,
  isAssignedMentor,
  isEnrolled,
  getAccess,
  assertCanManage,
  assertCanModerate,
};
