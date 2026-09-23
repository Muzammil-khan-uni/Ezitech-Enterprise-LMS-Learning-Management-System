const mongoose = require('mongoose');
const CourseReview = require('../../models/CourseReview.model');
const { Enrollment } = require('../../models/Enrollment.model');
const { Course } = require('../../models/Course.model');
const ApiError = require('../../utils/ApiError');

async function createReview(studentId, courseId, { rating, comment }) {
  const completedEnrollment = await Enrollment.findOne({ student: studentId, course: courseId, status: 'completed' });
  if (!completedEnrollment) {
    throw ApiError.forbidden('You can only review a course after completing it');
  }

  const existing = await CourseReview.findOne({ student: studentId, course: courseId });
  if (existing) throw ApiError.conflict('You have already reviewed this course');

  return CourseReview.create({ student: studentId, course: courseId, rating, comment });
}

async function updateReview(reviewId, studentId, updates) {
  const review = await CourseReview.findOne({ _id: reviewId, student: studentId });
  if (!review) throw ApiError.notFound('Review not found');

  Object.assign(review, updates);
  await review.save();
  return review;
}

async function deleteReview(reviewId, requester) {
  const review = await CourseReview.findById(reviewId);
  if (!review) throw ApiError.notFound('Review not found');

  const isOwner = review.student.toString() === requester.id;
  if (!isOwner && requester.role !== 'admin') {
    throw ApiError.forbidden('You cannot delete this review');
  }

  await review.deleteOne();
}

async function listCourseReviews(courseId, { page = 1, limit = 20 } = {}) {
  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    CourseReview.find({ course: courseId }).populate('student', 'name').sort('-createdAt').skip(skip).limit(limit),
    CourseReview.countDocuments({ course: courseId }),
  ]);
  return { items, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
}

async function getCourseRatingSummary(courseId) {
  const [summary] = await CourseReview.aggregate([
    { $match: { course: new mongoose.Types.ObjectId(courseId) } },
    {
      $group: {
        _id: null,
        averageRating: { $avg: '$rating' },
        totalReviews: { $sum: 1 },
        distribution: { $push: '$rating' },
      },
    },
  ]);

  if (!summary) {
    return { averageRating: null, totalReviews: 0, distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } };
  }

  const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  summary.distribution.forEach((r) => {
    distribution[r] = (distribution[r] || 0) + 1;
  });

  return {
    averageRating: Math.round(summary.averageRating * 10) / 10,
    totalReviews: summary.totalReviews,
    distribution,
  };
}

async function getInstructorFeedback(instructorId) {
  const courses = await Course.find({ instructor: instructorId }).select('title');
  const courseIds = courses.map((c) => c._id);

  const summaries = await CourseReview.aggregate([
    { $match: { course: { $in: courseIds } } },
    { $sort: { createdAt: -1 } },
    {
      $group: {
        _id: '$course',
        averageRating: { $avg: '$rating' },
        totalReviews: { $sum: 1 },
        recentReviews: { $push: { rating: '$rating', comment: '$comment', student: '$student', createdAt: '$createdAt' } },
      },
    },
  ]);

  const summaryByCourseId = new Map(summaries.map((s) => [s._id.toString(), s]));

  const { User } = require('../../models/User.model');
  const allStudentIds = summaries.flatMap((s) => s.recentReviews.slice(0, 3).map((r) => r.student));
  const students = await User.find({ _id: { $in: allStudentIds } }).select('name');
  const studentNameById = new Map(students.map((s) => [s._id.toString(), s.name]));

  return courses.map((course) => {
    const summary = summaryByCourseId.get(course._id.toString());
    return {
      course: { _id: course._id, title: course.title },
      averageRating: summary ? Math.round(summary.averageRating * 10) / 10 : null,
      totalReviews: summary?.totalReviews || 0,
      recentReviews: (summary?.recentReviews || []).slice(0, 3).map((r) => ({
        rating: r.rating,
        comment: r.comment,
        studentName: studentNameById.get(r.student.toString()) || 'Unknown',
        createdAt: r.createdAt,
      })),
    };
  });
}

module.exports = {
  createReview,
  updateReview,
  deleteReview,
  listCourseReviews,
  getCourseRatingSummary,
  getInstructorFeedback,
};
