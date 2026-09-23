const mongoose = require('mongoose');
const { Course } = require('../../models/Course.model');
const { Enrollment } = require('../../models/Enrollment.model');
const { Assessment } = require('../../models/Assessment.model');
const { Submission } = require('../../models/Submission.model');
const { User } = require('../../models/User.model');
const Certificate = require('../../models/Certificate.model');
const Progress = require('../../models/Progress.model');
const Attendance = require('../../models/Attendance.model');
const UserSubscription = require('../../models/UserSubscription.model');
const env = require('../../config/env');

async function getStudentDashboard(studentId) {
  const enrollments = await Enrollment.find({ student: studentId })
    .populate('course', 'title level thumbnailUrl')
    .sort('-enrolledAt');

  const active = enrollments.filter((e) => e.status === 'active');
  const completed = enrollments.filter((e) => e.status === 'completed');
  const activeCourseIds = active.map((e) => e.course._id);

  const upcomingDeadlines = await Assessment.find({
    course: { $in: activeCourseIds },
    isPublished: true,
    dueDate: { $gte: new Date() },
  })
    .select('title dueDate course assessmentType')
    .populate('course', 'title')
    .sort('dueDate')
    .limit(5);

  const certificatesCount = await Certificate.countDocuments({ student: studentId, isRevoked: false });

  const recentSubmissions = await Submission.find({ student: studentId })
    .select('status score maxScore assessment')
    .populate('assessment', 'title assessmentType')
    .sort('-createdAt')
    .limit(10);

  return {
    activeCourses: active,
    completedCourses: completed,
    upcomingDeadlines,
    certificatesCount,
    recentSubmissions,
  };
}

async function getInstructorDashboard(instructorId) {
  const courses = await Course.find({ instructor: instructorId }).select('title status');
  const courseIds = courses.map((c) => c._id);

  const totalStudents = await Enrollment.countDocuments({
    course: { $in: courseIds },
    status: { $ne: 'dropped' },
  });

  const assessmentIds = (await Assessment.find({ course: { $in: courseIds } }).select('_id')).map((a) => a._id);
  const pendingGradingCount = await Submission.countDocuments({
    assessment: { $in: assessmentIds },
    status: 'submitted',
  });

  const perCourseStats = await Enrollment.aggregate([
    { $match: { course: { $in: courseIds } } },
    {
      $group: {
        _id: '$course',
        enrolledCount: { $sum: 1 },
        completedCount: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
        averageProgress: { $avg: '$progressPercent' },
      },
    },
  ]);

  const statsByCourseId = new Map(perCourseStats.map((s) => [s._id.toString(), s]));

  const courseBreakdown = courses.map((course) => {
    const stats = statsByCourseId.get(course._id.toString());
    return {
      course: { _id: course._id, title: course.title, status: course.status },
      enrolledCount: stats?.enrolledCount || 0,
      completedCount: stats?.completedCount || 0,
      completionRate: stats?.enrolledCount ? Math.round((stats.completedCount / stats.enrolledCount) * 100) : 0,
      averageProgress: stats?.averageProgress ? Math.round(stats.averageProgress) : 0,
    };
  });

  return { totalCourses: courses.length, totalStudents, pendingGradingCount, courseBreakdown };
}

async function getInstructorEarnings(instructorId) {
  if (!env.paymentsEnabled) {
    return { paymentsEnabled: false, commissionPercent: env.instructorCommissionPercent, totalGrossRevenue: 0, totalInstructorEarnings: 0, courses: [] };
  }
  const courses = await Course.find({ instructor: instructorId }).select('title status');
  const courseIds = courses.map((c) => c._id);

  const perCourseRevenue = await Enrollment.aggregate([
    { $match: { course: { $in: courseIds }, pricePaid: { $gt: 0 } } },
    { $group: { _id: '$course', purchases: { $sum: 1 }, grossRevenue: { $sum: '$pricePaid' } } },
  ]);
  const revenueByCourseId = new Map(perCourseRevenue.map((r) => [r._id.toString(), r]));

  const commissionPercent = env.instructorCommissionPercent;
  const courseEarnings = courses.map((course) => {
    const revenue = revenueByCourseId.get(course._id.toString());
    const grossRevenue = revenue?.grossRevenue || 0;
    return {
      course: { _id: course._id, title: course.title, status: course.status },
      purchases: revenue?.purchases || 0,
      grossRevenue,
      instructorEarnings: Math.round(grossRevenue * (commissionPercent / 100) * 100) / 100,
    };
  });

  const totalGrossRevenue = courseEarnings.reduce((sum, c) => sum + c.grossRevenue, 0);
  const totalInstructorEarnings = courseEarnings.reduce((sum, c) => sum + c.instructorEarnings, 0);

  return {
    commissionPercent,
    totalGrossRevenue: Math.round(totalGrossRevenue * 100) / 100,
    totalInstructorEarnings: Math.round(totalInstructorEarnings * 100) / 100,
    courses: courseEarnings.filter((c) => c.purchases > 0).sort((a, b) => b.grossRevenue - a.grossRevenue),
  };
}

async function getStudentGrowth(months = 6) {
  const since = new Date();
  since.setMonth(since.getMonth() - months);

  return User.aggregate([
    { $match: { role: 'student', createdAt: { $gte: since } } },
    {
      $group: {
        _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
        count: { $sum: 1 },
      },
    },
    { $sort: { '_id.year': 1, '_id.month': 1 } },
  ]);
}

async function getCoursePerformance() {
  return Enrollment.aggregate([
    {
      $group: {
        _id: '$course',
        enrolledCount: { $sum: 1 },
        completedCount: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
        averageProgress: { $avg: '$progressPercent' },
      },
    },
    {
      $lookup: { from: 'courses', localField: '_id', foreignField: '_id', as: 'course' },
    },
    { $unwind: '$course' },
    {
      $project: {
        courseTitle: '$course.title',
        enrolledCount: 1,
        completedCount: 1,
        completionRate: {
          $cond: [{ $eq: ['$enrolledCount', 0] }, 0, { $multiply: [{ $divide: ['$completedCount', '$enrolledCount'] }, 100] }],
        },
        averageProgress: { $round: ['$averageProgress', 0] },
      },
    },
    { $sort: { enrolledCount: -1 } },
  ]);
}

async function getInstructorPerformance() {
  return Course.aggregate([
    {
      $lookup: { from: 'enrollments', localField: '_id', foreignField: 'course', as: 'enrollments' },
    },
    {
      $group: {
        _id: '$instructor',
        courseCount: { $sum: 1 },
        totalEnrollments: { $sum: { $size: '$enrollments' } },
        totalCompleted: {
          $sum: {
            $size: { $filter: { input: '$enrollments', cond: { $eq: ['$$this.status', 'completed'] } } },
          },
        },
      },
    },
    { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'instructor' } },
    { $unwind: '$instructor' },
    {
      $project: {
        instructorName: '$instructor.name',
        courseCount: 1,
        totalEnrollments: 1,
        completionRate: {
          $cond: [
            { $eq: ['$totalEnrollments', 0] },
            0,
            { $multiply: [{ $divide: ['$totalCompleted', '$totalEnrollments'] }, 100] },
          ],
        },
      },
    },
    { $sort: { totalEnrollments: -1 } },
  ]);
}

async function getOverallEngagement() {
  const [enrollmentStats] = await Enrollment.aggregate([
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        active: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } },
        completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
        dropped: { $sum: { $cond: [{ $eq: ['$status', 'dropped'] }, 1, 0] } },
        averageProgress: { $avg: '$progressPercent' },
      },
    },
  ]);

  return (
    enrollmentStats || { total: 0, active: 0, completed: 0, dropped: 0, averageProgress: 0 }
  );
}

async function getRevenueAnalytics(months = 6) {
  if (!env.paymentsEnabled) {
    return {
      paymentsEnabled: false,
      totalRevenue: 0,
      courseRevenue: 0,
      subscriptionRevenue: 0,
      revenueOverTime: [],
      revenueByCourse: [],
      revenueByPlan: [],
    };
  }
  const since = new Date();
  since.setMonth(since.getMonth() - months);

  const [enrollmentRevenue, subscriptionRevenue, enrollmentByMonth, subscriptionByMonth, revenueByCourse, revenueByPlan] =
    await Promise.all([
      Enrollment.aggregate([{ $match: { pricePaid: { $gt: 0 } } }, { $group: { _id: null, total: { $sum: '$pricePaid' } } }]),
      UserSubscription.aggregate([{ $group: { _id: null, total: { $sum: '$pricePaid' } } }]),

      Enrollment.aggregate([
        { $match: { pricePaid: { $gt: 0 }, enrolledAt: { $gte: since } } },
        {
          $group: {
            _id: { year: { $year: '$enrolledAt' }, month: { $month: '$enrolledAt' } },
            amount: { $sum: '$pricePaid' },
          },
        },
      ]),
      UserSubscription.aggregate([
        { $match: { createdAt: { $gte: since } } },
        {
          $group: {
            _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
            amount: { $sum: '$pricePaid' },
          },
        },
      ]),

      Enrollment.aggregate([
        { $match: { pricePaid: { $gt: 0 } } },
        { $group: { _id: '$course', revenue: { $sum: '$pricePaid' }, purchases: { $sum: 1 } } },
        { $lookup: { from: 'courses', localField: '_id', foreignField: '_id', as: 'course' } },
        { $unwind: '$course' },
        { $project: { courseTitle: '$course.title', revenue: 1, purchases: 1 } },
        { $sort: { revenue: -1 } },
      ]),

      UserSubscription.aggregate([
        { $group: { _id: '$plan', revenue: { $sum: '$pricePaid' }, subscribers: { $sum: 1 } } },
        { $lookup: { from: 'subscriptionplans', localField: '_id', foreignField: '_id', as: 'plan' } },
        { $unwind: '$plan' },
        { $project: { planName: '$plan.name', revenue: 1, subscribers: 1 } },
        { $sort: { revenue: -1 } },
      ]),
    ]);

  const monthlyMap = new Map();
  const addToMonth = (year, month, amount) => {
    const key = `${year}-${String(month).padStart(2, '0')}`;
    monthlyMap.set(key, (monthlyMap.get(key) || 0) + amount);
  };
  enrollmentByMonth.forEach((m) => addToMonth(m._id.year, m._id.month, m.amount));
  subscriptionByMonth.forEach((m) => addToMonth(m._id.year, m._id.month, m.amount));

  const revenueOverTime = Array.from(monthlyMap.entries())
    .map(([month, amount]) => ({ month, amount }))
    .sort((a, b) => a.month.localeCompare(b.month));

  return {
    totalRevenue: (enrollmentRevenue[0]?.total || 0) + (subscriptionRevenue[0]?.total || 0),
    courseRevenue: enrollmentRevenue[0]?.total || 0,
    subscriptionRevenue: subscriptionRevenue[0]?.total || 0,
    revenueOverTime,
    revenueByCourse,
    revenueByPlan,
  };
}

async function getAdminAnalytics() {
  const [studentGrowth, coursePerformance, instructorPerformance, engagement, revenue] = await Promise.all([
    getStudentGrowth(),
    getCoursePerformance(),
    getInstructorPerformance(),
    getOverallEngagement(),
    getRevenueAnalytics(),
  ]);

  return { studentGrowth, coursePerformance, instructorPerformance, engagement, revenue };
}

async function getLearningStatistics(studentId) {
  const studentObjectId = new mongoose.Types.ObjectId(studentId);

  const [lessonsCompleted, videoTimeAgg, attendanceTimeAgg, quizStats] = await Promise.all([
    Progress.countDocuments({ student: studentId, isCompleted: true }),

    Progress.aggregate([
      { $match: { student: studentObjectId } },
      { $group: { _id: null, totalSeconds: { $sum: '$timeSpentSeconds' } } },
    ]),

    Attendance.aggregate([
      { $match: { student: studentObjectId } },
      { $group: { _id: null, totalSeconds: { $sum: '$durationSeconds' } } },
    ]),

    Submission.aggregate([
      { $match: { student: studentObjectId, status: { $in: ['auto_graded', 'graded'] }, maxScore: { $gt: 0 } } },
      { $lookup: { from: 'assessments', localField: 'assessment', foreignField: '_id', as: 'assessment' } },
      { $unwind: '$assessment' },
      { $match: { 'assessment.assessmentType': 'quiz' } },
      { $project: { percent: { $multiply: [{ $divide: ['$score', '$maxScore'] }, 100] } } },
      { $group: { _id: null, avgPercent: { $avg: '$percent' }, attempts: { $sum: 1 } } },
    ]),
  ]);

  const activityStreak = await computeActivityStreak(studentId);

  return {
    lessonsCompleted,
    totalTimeSpentSeconds: (videoTimeAgg[0]?.totalSeconds || 0) + (attendanceTimeAgg[0]?.totalSeconds || 0),
    quizAveragePercent: quizStats[0] ? Math.round(quizStats[0].avgPercent) : null,
    quizAttempts: quizStats[0]?.attempts || 0,
    currentStreakDays: activityStreak,
  };
}

async function computeActivityStreak(studentId) {
  const studentObjectId = new mongoose.Types.ObjectId(studentId);

  const [progressDays, submissionDays, attendanceDays] = await Promise.all([
    Progress.aggregate([
      { $match: { student: studentObjectId, isCompleted: true, completedAt: { $ne: null } } },
      { $project: { day: { $dateToString: { format: '%Y-%m-%d', date: '$completedAt' } } } },
    ]),
    Submission.aggregate([
      { $match: { student: studentObjectId, submittedAt: { $ne: null } } },
      { $project: { day: { $dateToString: { format: '%Y-%m-%d', date: '$submittedAt' } } } },
    ]),
    Attendance.aggregate([
      { $match: { student: studentObjectId } },
      { $project: { day: { $dateToString: { format: '%Y-%m-%d', date: '$joinedAt' } } } },
    ]),
  ]);

  const activeDays = new Set([
    ...progressDays.map((d) => d.day),
    ...submissionDays.map((d) => d.day),
    ...attendanceDays.map((d) => d.day),
  ]);

  if (activeDays.size === 0) return 0;

  const toDayString = (date) => date.toISOString().slice(0, 10);
  const today = new Date();
  let cursor = new Date(today);

  if (!activeDays.has(toDayString(today))) {
    cursor.setDate(cursor.getDate() - 1);
    if (!activeDays.has(toDayString(cursor))) return 0;
  }

  let streak = 0;
  while (activeDays.has(toDayString(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

async function getMentorDashboard(mentorId) {
  const { LiveSession } = require('../../models/LiveSession.model');

  const courses = await Course.find({ mentors: mentorId })
    .select('title slug thumbnailUrl status')
    .sort('title')
    .lean();
  const courseIds = courses.map((course) => course._id);

  if (courseIds.length === 0) {
    return { courses: [], totals: { courses: 0, students: 0, pendingSubmissions: 0 }, pendingByCourse: [], upcomingSessions: [] };
  }

  const [enrollments, assessments, upcomingSessions] = await Promise.all([
    Enrollment.find({ course: { $in: courseIds }, status: { $ne: 'dropped' } }).select('course').lean(),
    Assessment.find({ course: { $in: courseIds } }).select('course title').lean(),
    LiveSession.find({
      course: { $in: courseIds },
      status: { $in: ['scheduled', 'live'] },
      scheduledAt: { $gte: new Date(Date.now() - 60 * 60 * 1000) },
    })
      .sort('scheduledAt')
      .limit(5)
      .populate('course', 'title')
      .lean(),
  ]);

  const studentsByCourse = {};
  for (const enrollment of enrollments) {
    const key = String(enrollment.course);
    studentsByCourse[key] = (studentsByCourse[key] || 0) + 1;
  }

  const assessmentCourse = {};
  for (const assessment of assessments) assessmentCourse[String(assessment._id)] = String(assessment.course);

  const pending = await Submission.find({
    assessment: { $in: assessments.map((assessment) => assessment._id) },
    status: 'submitted',
  })
    .select('assessment')
    .lean();

  const pendingByCourse = {};
  for (const submission of pending) {
    const key = assessmentCourse[String(submission.assessment)];
    pendingByCourse[key] = (pendingByCourse[key] || 0) + 1;
  }

  return {
    courses: courses.map((course) => ({
      ...course,
      students: studentsByCourse[String(course._id)] || 0,
      pendingSubmissions: pendingByCourse[String(course._id)] || 0,
    })),
    totals: {
      courses: courses.length,
      students: enrollments.length,
      pendingSubmissions: pending.length,
    },
    upcomingSessions,
  };
}

module.exports = { getMentorDashboard, getStudentDashboard, getInstructorDashboard, getInstructorEarnings, getAdminAnalytics, getRevenueAnalytics, getLearningStatistics };
