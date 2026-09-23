const LearningPath = require('../../models/LearningPath.model');
const { Enrollment } = require('../../models/Enrollment.model');
const { Course } = require('../../models/Course.model');
const ApiError = require('../../utils/ApiError');
const slugify = require('../../utils/slugify');
const notificationsService = require('../notifications/notifications.service');

const PATH_MANAGERS = ['course_manager', 'admin'];

function canManagePaths(reqUser) {
  return Boolean(reqUser) && PATH_MANAGERS.includes(reqUser.role);
}

async function generateUniqueSlug(title) {
  const base = slugify(title);
  let slug = base;
  let suffix = 1;
  while (await LearningPath.exists({ slug })) {
    slug = `${base}-${suffix}`;
    suffix += 1;
  }
  return slug;
}

async function createPath(data, creatorId) {
  const slug = await generateUniqueSlug(data.title);
  return LearningPath.create({ ...data, slug, createdBy: creatorId });
}

async function listPaths({ level, isPublished }, reqUser) {
  const filter = {};
  if (level) filter.level = level;

  if (canManagePaths(reqUser)) {
    if (isPublished !== undefined) filter.isPublished = isPublished;
  } else {
    filter.isPublished = true;
  }

  return LearningPath.find(filter).populate('courses.course', 'title slug level').sort('-createdAt');
}

async function getPath(pathId, reqUser) {
  const path = await LearningPath.findById(pathId).populate('courses.course', 'title slug level status');
  if (!path) throw ApiError.notFound('Learning path not found');

  if (!path.isPublished && !canManagePaths(reqUser)) {
    throw ApiError.notFound('Learning path not found');
  }

  return path;
}

async function updatePath(pathId, updates) {
  const path = await LearningPath.findById(pathId);
  if (!path) throw ApiError.notFound('Learning path not found');

  if (updates.title && updates.title !== path.title) {
    updates.slug = await generateUniqueSlug(updates.title);
  }

  Object.assign(path, updates);
  await path.save();
  return path;
}

async function setCourses(pathId, courses) {
  const path = await LearningPath.findById(pathId);
  if (!path) throw ApiError.notFound('Learning path not found');

  path.courses = courses;
  await path.save();
  return path;
}

async function deletePath(pathId) {
  const result = await LearningPath.deleteOne({ _id: pathId });
  if (result.deletedCount === 0) throw ApiError.notFound('Learning path not found');
}

module.exports = {
  createPath,
  listPaths,
  getPath,
  updatePath,
  setCourses,
  deletePath,
  getPathProgress,
  getMyStartedPaths,
  checkPathAdvancement,
};

async function getPathProgress(studentId, pathId) {
  const path = await LearningPath.findById(pathId).populate('courses.course', 'title slug level');
  if (!path) throw ApiError.notFound('Learning path not found');

  const sortedEntries = [...path.courses].sort((a, b) => a.order - b.order);
  const courseIds = sortedEntries.map((entry) => entry.course._id);

  const enrollments = await Enrollment.find({ student: studentId, course: { $in: courseIds } });
  const enrollmentByCourseId = new Map(enrollments.map((e) => [e.course.toString(), e]));

  const courses = sortedEntries.map((entry) => {
    const enrollment = enrollmentByCourseId.get(entry.course._id.toString());
    return {
      course: { _id: entry.course._id, title: entry.course.title, level: entry.course.level },
      order: entry.order,
      status: enrollment ? enrollment.status : 'not_started',
      progressPercent: enrollment?.progressPercent ?? 0,
    };
  });

  const completedCount = courses.filter((c) => c.status === 'completed').length;
  const percent = courses.length === 0 ? 0 : Math.round((completedCount / courses.length) * 100);
  const nextCourse = courses.find((c) => c.status !== 'completed') ?? null;

  return {
    path: { _id: path._id, title: path.title, level: path.level },
    courses,
    completedCount,
    totalCount: courses.length,
    percent,
    nextCourse,
    hasStarted: enrollments.length > 0,
  };
}

async function getMyStartedPaths(studentId) {
  const pathIds = await Enrollment.distinct('learningPath', { student: studentId, learningPath: { $ne: null } });
  if (pathIds.length === 0) return [];
  return Promise.all(pathIds.map((pathId) => getPathProgress(studentId, pathId)));
}

async function checkPathAdvancement(studentId, courseId) {
  const pathIds = await Enrollment.distinct('learningPath', { student: studentId, learningPath: { $ne: null } });
  if (pathIds.length === 0) return;

  const paths = await LearningPath.find({ _id: { $in: pathIds } });

  for (const path of paths) {
    const sorted = [...path.courses].sort((a, b) => a.order - b.order);
    const completedIndex = sorted.findIndex((entry) => entry.course.toString() === courseId.toString());
    if (completedIndex === -1) continue;

    const nextEntry = sorted[completedIndex + 1];
    if (!nextEntry) continue;

    const alreadyEnrolledInNext = await Enrollment.exists({ student: studentId, course: nextEntry.course });
    if (alreadyEnrolledInNext) continue;

    const nextCourse = await Course.findById(nextEntry.course).select('title');
    if (!nextCourse) continue;

    await notificationsService.notify(studentId, {
      type: 'course_update',
      title: 'Next course unlocked',
      message: `You've completed a course in "${path.title}" — "${nextCourse.title}" is now unlocked.`,
      relatedEntityType: 'Course',
      relatedEntityId: nextCourse._id,
    });
  }
}
