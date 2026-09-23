const { Enrollment } = require('../../models/Enrollment.model');
const { Course } = require('../../models/Course.model');
const LearningPath = require('../../models/LearningPath.model');
const ApiError = require('../../utils/ApiError');
const notificationsService = require('../notifications/notifications.service');
const couponsService = require('../coupons/coupons.service');
const subscriptionsService = require('../subscriptions/subscriptions.service');
const courseAccess = require('../../utils/courseAccess');
const { assertPaymentsEnabled } = require('../../utils/payments');

async function assertPrerequisitesMet(studentId, course) {
  if (!course.prerequisites || course.prerequisites.length === 0) return;

  const completed = await Enrollment.find({
    student: studentId,
    course: { $in: course.prerequisites },
    status: 'completed',
  }).select('course');

  const completedIds = new Set(completed.map((e) => e.course.toString()));
  const missing = course.prerequisites.filter((id) => !completedIds.has(id.toString()));

  if (missing.length > 0) {
    throw ApiError.badRequest(
      'Prerequisites not met for this course',
      missing.map((id) => id.toString())
    );
  }
}

async function enroll(studentId, courseId, couponCode) {
  const course = await Course.findById(courseId);
  if (!course) throw ApiError.notFound('Course not found');
  if (course.status !== 'published') {
    throw ApiError.badRequest('Cannot enroll in a course that is not published');
  }

  const existing = await Enrollment.findOne({ student: studentId, course: courseId });
  if (existing) {
    if (existing.status === 'dropped') {
      if (course.price > 0 && !(existing.pricePaid > 0)) assertPaymentsEnabled();
      await assertPrerequisitesMet(studentId, course);
      existing.status = 'active';
      existing.enrolledAt = new Date();
      existing.completedAt = undefined;
      await existing.save();
      return existing;
    }
    throw ApiError.conflict('Already enrolled in this course');
  }

  if (course.price > 0) assertPaymentsEnabled();

  await assertPrerequisitesMet(studentId, course);

  let pricePaid = 0;
  let redeemedCoupon = null;

  if (course.price > 0) {
    const activeSubscription = await subscriptionsService.getActiveSubscription(studentId);
    const coveredBySubscription = subscriptionsService.subscriptionCoversCourse(activeSubscription, courseId);

    if (!coveredBySubscription) {
      if (couponCode) {
        const { coupon, finalPrice } = await couponsService.applyCoupon(couponCode, course.price, courseId);
        pricePaid = finalPrice;
        redeemedCoupon = coupon;
      } else {
        pricePaid = course.price;
      }
    }
  }

  if (redeemedCoupon) {
    await couponsService.reserveRedemption(redeemedCoupon);
  }

  let enrollment;
  try {
    enrollment = await Enrollment.create({ student: studentId, course: courseId, pricePaid });
  } catch (err) {
    if (redeemedCoupon) await couponsService.releaseRedemption(redeemedCoupon._id);
    throw err;
  }

  await notificationsService.notify(studentId, {
    type: 'course_enrollment',
    title: `Enrolled in ${course.title}`,
    message: 'You can start learning right away.',
    relatedEntityType: 'course',
    relatedEntityId: course._id,
  });

  return enrollment;
}

async function enrollInLearningPath(studentId, pathId) {
  const path = await LearningPath.findById(pathId).populate('courses.course');
  if (!path) throw ApiError.notFound('Learning path not found');
  if (!path.isPublished) throw ApiError.badRequest('This learning path is not yet published');

  const sorted = [...path.courses].sort((a, b) => a.order - b.order);
  const courses = sorted.map((entry) => entry.course).filter(Boolean);
  if (courses.length === 0) throw ApiError.badRequest('This learning path has no available courses yet');

  const enrollment = await enroll(studentId, courses[0]._id);
  await Enrollment.updateOne({ _id: enrollment._id }, { $set: { learningPath: path._id } });
  return Enrollment.findById(enrollment._id);
}

async function drop(studentId, courseId) {
  const enrollment = await Enrollment.findOne({ student: studentId, course: courseId });
  if (!enrollment) throw ApiError.notFound('Enrollment not found');
  enrollment.status = 'dropped';
  await enrollment.save();
  return enrollment;
}

async function listMyEnrollments(studentId, status) {
  const filter = { student: studentId };
  if (status) filter.status = status;
  return Enrollment.find(filter).populate('course', 'title slug thumbnailUrl level').sort('-enrolledAt');
}

async function listCourseEnrollments(courseId, reqUser) {
  await courseAccess.assertCanModerate(
    courseId,
    reqUser,
    'You can only view the students of courses you teach or mentor'
  );
  return Enrollment.find({ course: courseId }).populate('student', 'name email').sort('-enrolledAt');
}

module.exports = {
  assertPrerequisitesMet,
  enroll,
  enrollInLearningPath,
  drop,
  listMyEnrollments,
  listCourseEnrollments,
};
