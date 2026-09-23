const { Readable } = require('node:stream');
const { Course } = require('../../models/Course.model');
const Section = require('../../models/Section.model');
const { Lesson } = require('../../models/Lesson.model');
const { User } = require('../../models/User.model');
const ApiError = require('../../utils/ApiError');
const slugify = require('../../utils/slugify');
const { getOrSet, invalidatePrefix } = require('../../utils/cache');
const notificationsService = require('../notifications/notifications.service');
const courseAccess = require('../../utils/courseAccess');
const { releaseAssets, lessonAssetUrls } = require('../../utils/assetCleanup');
const env = require('../../config/env');

const CATALOG_CACHE_PREFIX = 'cache:courses:catalog:';

const PRIVILEGED_ROLES = ['admin', 'course_manager'];

const PROTECTED_LESSON_FIELDS = [
  'videoUrl',
  'captionsUrl',
  'fileUrl',
  'packageUrl',
  'entryPoint',
  'instructions',
  'rubric',
  'starterCode',
];

async function resolveCourseAccess(course, reqUser) {
  if (!reqUser) return { canManage: false, canConsume: false };

  const isOwner = course.instructor.toString() === reqUser.id;
  const canManage = isOwner || PRIVILEGED_ROLES.includes(reqUser.role);
  if (canManage) {
    return { canManage: true, canConsume: true };
  }
  if (await courseAccess.isAssignedMentor(course._id, reqUser)) {
    return { canManage: false, canConsume: true };
  }

  const { Enrollment } = require('../../models/Enrollment.model');
  const isEnrolled = await Enrollment.exists({
    student: reqUser.id,
    course: course._id,
    status: { $ne: 'dropped' },
  });

  return { canManage: false, canConsume: Boolean(isEnrolled) };
}

function stripLessonContent(lesson, canConsume) {
  const obj = typeof lesson.toObject === 'function' ? lesson.toObject() : { ...lesson };
  if (canConsume || obj.isPreview) return { ...obj, locked: false };

  for (const field of PROTECTED_LESSON_FIELDS) {
    delete obj[field];
  }
  return { ...obj, locked: true };
}

function redactScormInternals(lesson, canManage) {
  const obj = typeof lesson.toObject === 'function' ? lesson.toObject() : { ...lesson };
  if (canManage || obj.lessonType !== 'scorm') return obj;
  delete obj.packageUrl;
  delete obj.entryPoint;
  return obj;
}

async function assertCanEditCourse(course, reqUser) {
  const isOwner = course.instructor.toString() === reqUser.id;
  const isPrivileged = ['admin', 'course_manager'].includes(reqUser.role);
  if (!isOwner && !isPrivileged) {
    throw ApiError.forbidden('You do not have permission to modify this course');
  }
}

async function generateUniqueSlug(title) {
  const base = slugify(title);
  let slug = base;
  let suffix = 1;
  while (await Course.exists({ slug })) {
    slug = `${base}-${suffix}`;
    suffix += 1;
  }
  return slug;
}

function assertPriceAllowed(price) {
  if (price > 0 && !env.paymentsEnabled) {
    throw ApiError.badRequest('Paid courses are not available yet. Leave the price at 0.');
  }
}

async function createCourse(data, instructorId) {
  assertPriceAllowed(data.price);
  const slug = await generateUniqueSlug(data.title);
  const course = await Course.create({ ...data, slug, instructor: instructorId, status: 'draft' });
  await invalidatePrefix(CATALOG_CACHE_PREFIX);
  return course;
}

async function getCourse(courseId, reqUser) {
  const course = await Course.findById(courseId).populate('category', 'name slug');
  if (!course) throw ApiError.notFound('Course not found');

  if (course.status !== 'published') {
    const { canManage } = await resolveCourseAccess(course, reqUser);
    if (!canManage) throw ApiError.notFound('Course not found');
  }

  return course;
}

async function listCourses({ status, category, instructor, search, language, page: rawPage = 1, limit: rawLimit = 20 }, reqUser) {
  const page = Math.max(1, parseInt(rawPage, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(rawLimit, 10) || 20));
  const filter = {};

  const isPrivileged = reqUser && PRIVILEGED_ROLES.includes(reqUser.role);
  const isOwnLibrary = reqUser && instructor && instructor === reqUser.id;

  if (isPrivileged || isOwnLibrary) {
    if (status) filter.status = status;
  } else {
    filter.status = 'published';
  }
  if (category) filter.category = category;
  if (instructor) filter.instructor = instructor;
  if (language) filter.language = language;
  if (search) filter.$text = { $search: search };

  const skip = (page - 1) * limit;

  const runQuery = async () => {
    const [items, total] = await Promise.all([
      Course.find(filter).populate('category', 'name slug').skip(skip).limit(limit).sort('-createdAt'),
      Course.countDocuments(filter),
    ]);
    return { items, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
  };

  const isCacheableCatalogQuery =
    filter.status === 'published' && !isPrivileged && !isOwnLibrary && !category && !instructor && !search;
  if (!isCacheableCatalogQuery) return runQuery();

  return getOrSet(`${CATALOG_CACHE_PREFIX}lang:${language || 'any'}:page:${page}:limit:${limit}`, 60, runQuery);
}

async function updateCourse(courseId, updates, reqUser) {
  const course = await Course.findById(courseId);
  if (!course) throw ApiError.notFound('Course not found');
  await assertCanEditCourse(course, reqUser);

  if (updates.price !== undefined && updates.price !== course.price) assertPriceAllowed(updates.price);

  if (updates.title && updates.title !== course.title) {
    updates.slug = await generateUniqueSlug(updates.title);
  }

  const isMaterialChange =
    (updates.title && updates.title !== course.title) ||
    (updates.description !== undefined && updates.description !== course.description);
  const wasPublished = course.status === 'published';

  Object.assign(course, updates);
  await course.save();
  await invalidatePrefix(CATALOG_CACHE_PREFIX);

  if (isMaterialChange && wasPublished) {
    await notificationsService.notifyEnrolledStudents(courseId, {
      type: 'course_update',
      title: `${course.title} was updated`,
      message: 'Course details have changed - take a look at what\'s new.',
      relatedEntityType: 'course',
      relatedEntityId: course._id,
    });
  }

  return course;
}

async function deleteCourse(courseId, reqUser) {
  const course = await Course.findById(courseId);
  if (!course) throw ApiError.notFound('Course not found');
  await assertCanEditCourse(course, reqUser);

  const { Assessment } = require('../../models/Assessment.model');
  const { Submission } = require('../../models/Submission.model');
  const { Enrollment } = require('../../models/Enrollment.model');
  const Progress = require('../../models/Progress.model');
  const ScormProgress = require('../../models/ScormProgress.model');
  const Attendance = require('../../models/Attendance.model');
  const { LiveSession } = require('../../models/LiveSession.model');
  const LearningPath = require('../../models/LearningPath.model');
  const Thread = require('../../models/Thread.model');
  const Comment = require('../../models/Comment.model');
  const CourseReview = require('../../models/CourseReview.model');

  const paidEnrollments = await Enrollment.countDocuments({ course: courseId, pricePaid: { $gt: 0 } });
  if (paidEnrollments > 0) {
    throw ApiError.conflict(
      'This course has paying students, so deleting it would erase revenue records. Archive it instead.'
    );
  }

  const sections = await Section.find({ course: courseId }).select('_id');
  const lessons = await Lesson.find({ course: courseId });
  const assessmentIds = await Assessment.find({ course: courseId }).distinct('_id');
  const threadIds = await Thread.find({ course: courseId }).distinct('_id');

  await Promise.all([
    Lesson.deleteMany({ course: courseId }),
    Section.deleteMany({ course: courseId }),
    Submission.deleteMany({ assessment: { $in: assessmentIds } }),
    Assessment.deleteMany({ course: courseId }),
    Enrollment.deleteMany({ course: courseId }),
    Progress.deleteMany({ course: courseId }),
    ScormProgress.deleteMany({ course: courseId }),
    Attendance.deleteMany({ course: courseId }),
    LiveSession.deleteMany({ course: courseId }),
    Comment.deleteMany({ thread: { $in: threadIds } }),
    Thread.deleteMany({ course: courseId }),
    CourseReview.deleteMany({ course: courseId }),
    Course.updateMany({ prerequisites: courseId }, { $pull: { prerequisites: courseId } }),
  ]);

  const affectedPaths = await LearningPath.find({ 'courses.course': courseId });
  for (const path of affectedPaths) {
    path.courses = path.courses.filter((entry) => String(entry.course) !== String(courseId));
    await path.save();
  }

  await course.deleteOne();
  await invalidatePrefix(CATALOG_CACHE_PREFIX);

  const { assetUrlFromPackageUrl } = require('../scorm/scorm.service');
  releaseAssets([course.thumbnailUrl, ...lessonAssetUrls(lessons, assetUrlFromPackageUrl)]).catch(() => undefined);

  return { deletedSections: sections.length };
}

async function setCourseStatus(courseId, status, reqUser) {
  const course = await Course.findById(courseId);
  if (!course) throw ApiError.notFound('Course not found');
  await assertCanEditCourse(course, reqUser);

  if (status === 'published') {
    if (course.price > 0 && !env.paymentsEnabled) {
      throw ApiError.badRequest('Paid courses cannot be published yet. Set the price to 0 first.');
    }
    const sectionCount = await Section.countDocuments({ course: courseId });
    if (sectionCount === 0) {
      throw ApiError.badRequest('Cannot publish a course with no sections');
    }
    const lessonCount = await Lesson.countDocuments({ course: courseId });
    if (lessonCount === 0) {
      throw ApiError.badRequest('Cannot publish a course with no lessons');
    }
    course.publishedAt = course.publishedAt || new Date();
  }

  course.status = status;
  await course.save();
  await invalidatePrefix(CATALOG_CACHE_PREFIX);
  return course;
}

async function addSection(courseId, data, reqUser) {
  const course = await Course.findById(courseId);
  if (!course) throw ApiError.notFound('Course not found');
  await assertCanEditCourse(course, reqUser);

  const section = await Section.create({ course: courseId, ...data });
  course.contentVersion += 1;
  await course.save();
  return section;
}

async function listSections(courseId, reqUser) {
  await getCourse(courseId, reqUser);
  return Section.find({ course: courseId }).sort('order');
}

async function listSectionsUnchecked(courseId) {
  return Section.find({ course: courseId }).sort('order');
}

async function reorderSections(courseId, orderedIds, reqUser) {
  const course = await Course.findById(courseId);
  if (!course) throw ApiError.notFound('Course not found');
  await assertCanEditCourse(course, reqUser);

  const ops = orderedIds.map((id, index) => ({
    updateOne: { filter: { _id: id, course: courseId }, update: { order: index } },
  }));
  if (ops.length) await Section.bulkWrite(ops);

  course.contentVersion += 1;
  await course.save();
  return listSectionsUnchecked(courseId);
}

async function deleteSection(courseId, sectionId, reqUser) {
  const course = await Course.findById(courseId);
  if (!course) throw ApiError.notFound('Course not found');
  await assertCanEditCourse(course, reqUser);

  const section = await Section.findOne({ _id: sectionId, course: courseId });
  if (!section) throw ApiError.notFound('Section not found');

  await Lesson.deleteMany({ section: sectionId, course: courseId });
  await section.deleteOne();

  course.contentVersion += 1;
  await course.save();
}

async function addLesson(courseId, data, reqUser) {
  const course = await Course.findById(courseId);
  if (!course) throw ApiError.notFound('Course not found');
  await assertCanEditCourse(course, reqUser);

  const section = await Section.findOne({ _id: data.section, course: courseId });
  if (!section) throw ApiError.badRequest('Section does not belong to this course');

  const lesson = await Lesson.create({ ...data, course: courseId });
  course.contentVersion += 1;
  await course.save();

  if (course.status === 'published') {
    await notificationsService.notifyEnrolledStudents(courseId, {
      type: 'course_update',
      title: `New content in ${course.title}`,
      message: `A new lesson was added: ${lesson.title}`,
      relatedEntityType: 'course',
      relatedEntityId: course._id,
    });
  }

  return lesson;
}

async function listLessons(courseId, sectionId, reqUser) {
  const course = await getCourse(courseId, reqUser);
  const { canConsume, canManage } = await resolveCourseAccess(course, reqUser);

  const filter = { course: courseId };
  if (sectionId) filter.section = sectionId;

  const lessons = await Lesson.find(filter).sort('order');
  return lessons.map((lesson) => redactScormInternals(stripLessonContent(lesson, canConsume), canManage));
}

async function loadLessonWithAccess(courseId, lessonId, reqUser) {
  const course = await getCourse(courseId, reqUser);
  const lesson = await Lesson.findOne({ _id: lessonId, course: courseId });
  if (!lesson) throw ApiError.notFound('Lesson not found');

  const access = await resolveCourseAccess(course, reqUser);
  if (!access.canConsume && !lesson.isPreview) {
    throw ApiError.forbidden('Enroll in this course to access this lesson');
  }

  return { lesson, access };
}

async function getLessonForStudy(courseId, lessonId, reqUser) {
  const { lesson } = await loadLessonWithAccess(courseId, lessonId, reqUser);
  return lesson;
}

async function getLessonView(courseId, lessonId, reqUser) {
  const { lesson, access } = await loadLessonWithAccess(courseId, lessonId, reqUser);
  return redactScormInternals(lesson, access.canManage);
}

async function updateLesson(courseId, lessonId, updates, reqUser) {
  const course = await Course.findById(courseId);
  if (!course) throw ApiError.notFound('Course not found');
  await assertCanEditCourse(course, reqUser);

  const lesson = await Lesson.findOne({ _id: lessonId, course: courseId });
  if (!lesson) throw ApiError.notFound('Lesson not found');

  const previousUrls = [lesson.videoUrl, lesson.fileUrl];
  const { lessonType: _lessonType, ...changes } = updates;
  lesson.set(changes);
  await lesson.save();

  course.contentVersion += 1;
  await course.save();

  const replaced = previousUrls.filter((url) => url && url !== lesson.videoUrl && url !== lesson.fileUrl);
  if (replaced.length > 0) releaseAssets(replaced).catch(() => undefined);
  return lesson;
}

async function deleteLesson(courseId, lessonId, reqUser) {
  const course = await Course.findById(courseId);
  if (!course) throw ApiError.notFound('Course not found');
  await assertCanEditCourse(course, reqUser);

  const lesson = await Lesson.findOne({ _id: lessonId, course: courseId });
  if (!lesson) throw ApiError.notFound('Lesson not found');
  await lesson.deleteOne();

  const Progress = require('../../models/Progress.model');
  const ScormProgress = require('../../models/ScormProgress.model');
  await Promise.all([Progress.deleteMany({ lesson: lessonId }), ScormProgress.deleteMany({ lesson: lessonId })]);

  course.contentVersion += 1;
  await course.save();

  const { assetUrlFromPackageUrl } = require('../scorm/scorm.service');
  releaseAssets(lessonAssetUrls([lesson], assetUrlFromPackageUrl)).catch(() => undefined);
  refreshCourseProgress(courseId).catch(() => undefined);
}

async function refreshCourseProgress(courseId) {
  const { Enrollment } = require('../../models/Enrollment.model');
  const progressService = require('../progress/progress.service');
  const enrollments = await Enrollment.find({ course: courseId, status: { $ne: 'dropped' } }).select('student').lean();
  for (const enrollment of enrollments) {
    await progressService.recomputeEnrollmentProgress(enrollment.student, courseId);
  }
}

const MAX_OFFLINE_PACKAGE_BYTES = 2 * 1024 * 1024 * 1024;

function guessExtension(url, fallback) {
  try {
    const pathname = new URL(url).pathname;
    const match = pathname.match(/\.([a-zA-Z0-9]{2,5})$/);
    return match ? match[1] : fallback;
  } catch {
    return fallback;
  }
}

async function assertCanDownloadOffline(courseId, reqUser) {
  const course = await Course.findById(courseId).select('instructor status');
  if (!course) throw ApiError.notFound('Course not found');

  const access = await resolveCourseAccess(course, reqUser);
  if (!access.canConsume) {
    throw ApiError.forbidden('You must be enrolled in this course to download it offline');
  }
  if (!access.canManage && course.status !== 'published') {
    throw ApiError.forbidden('This course is not currently available');
  }
}

async function listCourseMentors(courseId, reqUser) {
  await courseAccess.assertCanManage(courseId, reqUser, 'You do not have permission to view this course\'s mentors');
  const course = await Course.findById(courseId).select('+mentors').populate('mentors', 'name email');
  return course.mentors;
}

async function setCourseMentors(courseId, mentorIds) {
  const course = await Course.findById(courseId).select('_id');
  if (!course) throw ApiError.notFound('Course not found');

  const unique = [...new Set(mentorIds.map(String))];
  const mentors = await User.find({ _id: { $in: unique }, role: 'mentor', isActive: true }).select('name email');
  if (mentors.length !== unique.length) {
    throw ApiError.badRequest('Every selected user must be an active mentor');
  }

  await Course.updateOne({ _id: courseId }, { $set: { mentors: unique } });
  return mentors;
}

async function streamOfflinePackage(courseId, res) {
  const archiver = require('archiver');
  const course = await Course.findById(courseId).populate('category', 'name');
  if (!course) throw ApiError.notFound('Course not found');

  const sections = await Section.find({ course: courseId }).sort('order');
  const lessons = await Lesson.find({ course: courseId }).sort('order');

  const downloadableLessons = lessons.filter(
    (l) => (l.lessonType === 'video' && l.videoUrl) || ((l.lessonType === 'pdf' || l.lessonType === 'download') && l.fileUrl)
  );

  let totalBytes = 0;
  for (const lesson of downloadableLessons) {
    const url = lesson.lessonType === 'video' ? lesson.videoUrl : lesson.fileUrl;
    try {
      const head = await fetch(url, { method: 'HEAD' });
      const length = Number(head.headers.get('content-length'));
      if (Number.isFinite(length)) totalBytes += length;
    } catch {
      continue;
    }
  }
  if (totalBytes > MAX_OFFLINE_PACKAGE_BYTES) {
    throw ApiError.payloadTooLarge(
      `This course's offline package would be too large to generate (${(totalBytes / 1024 / 1024 / 1024).toFixed(1)}GB, limit 2GB).`
    );
  }

  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', `attachment; filename="${course.slug}-offline.zip"`);

  const archive = archiver('zip', { zlib: { level: 9 } });
  archive.pipe(res);

  const manifest = {
    title: course.title,
    description: course.description,
    level: course.level,
    category: course.category?.name,
    generatedAt: new Date().toISOString(),
    sections: sections.map((s) => ({
      title: s.title,
      lessons: lessons
        .filter((l) => l.section.toString() === s._id.toString())
        .map((l) => ({ title: l.title, type: l.lessonType })),
    })),
  };
  archive.append(JSON.stringify(manifest, null, 2), { name: 'manifest.json' });

  for (const section of sections) {
    const sectionLessons = lessons.filter((l) => l.section.toString() === section._id.toString());
    for (const lesson of sectionLessons) {
      const safeTitle = lesson.title.replace(/[^\w\- ]/g, '').slice(0, 60);
      const folder = `${String(section.order).padStart(2, '0')}-${section.title.replace(/[^\w\- ]/g, '')}`;

      if (lesson.lessonType === 'video' && lesson.videoUrl) {
        const response = await fetch(lesson.videoUrl);
        if (response.ok && response.body) {
          const ext = guessExtension(lesson.videoUrl, 'mp4');
          archive.append(Readable.fromWeb(response.body), { name: `${folder}/${safeTitle}.${ext}` });
        } else {
          archive.append(`Could not fetch this video at package generation time: ${lesson.videoUrl}\n`, {
            name: `${folder}/${safeTitle}.txt`,
          });
        }
      } else if ((lesson.lessonType === 'pdf' || lesson.lessonType === 'download') && lesson.fileUrl) {
        const response = await fetch(lesson.fileUrl);
        if (response.ok && response.body) {
          const ext = guessExtension(lesson.fileUrl, lesson.lessonType === 'pdf' ? 'pdf' : 'bin');
          archive.append(Readable.fromWeb(response.body), { name: `${folder}/${safeTitle}.${ext}` });
        } else {
          archive.append(`Could not fetch this file at package generation time: ${lesson.fileUrl}\n`, {
            name: `${folder}/${safeTitle}.txt`,
          });
        }
      } else if (lesson.lessonType === 'assignment') {
        const content = `Assignment: ${lesson.title}\n\n${lesson.instructions}\n${lesson.dueDate ? `\nDue: ${lesson.dueDate}` : ''}`;
        archive.append(content, { name: `${folder}/${safeTitle}.txt` });
      } else if (lesson.lessonType === 'scorm') {
        const content = `SCORM lesson: ${lesson.title}\n\nSCORM content requires an internet connection to this platform to record your progress, so it isn't included in the offline package. Complete it online at:\n${course.slug ? `/courses/${courseId}` : ''}\n`;
        archive.append(content, { name: `${folder}/${safeTitle}.txt` });
      } else {
        archive.append(lesson.title, { name: `${folder}/${safeTitle}.txt` });
      }
    }
  }

  await archive.finalize();
}

module.exports = {
  createCourse,
  getCourse,
  listCourses,
  updateCourse,
  deleteCourse,
  setCourseStatus,
  addSection,
  listSections,
  listSectionsUnchecked,
  reorderSections,
  deleteSection,
  addLesson,
  listLessons,
  getLessonForStudy,
  getLessonView,
  assertCanDownloadOffline,
  listCourseMentors,
  setCourseMentors,
  updateLesson,
  deleteLesson,
  streamOfflinePackage,
  resolveCourseAccess,
};
