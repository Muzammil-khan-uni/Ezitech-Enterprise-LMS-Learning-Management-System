const { User } = require('../../models/User.model');
const { Course } = require('../../models/Course.model');
const { Enrollment } = require('../../models/Enrollment.model');
const { Assessment } = require('../../models/Assessment.model');
const { Submission } = require('../../models/Submission.model');
const Certificate = require('../../models/Certificate.model');
const ApiError = require('../../utils/ApiError');

function dateRangeFilter(field, { dateFrom, dateTo } = {}) {
  if (!dateFrom && !dateTo) return {};
  const range = {};
  if (dateFrom) range.$gte = new Date(dateFrom);
  if (dateTo) range.$lte = new Date(dateTo);
  return { [field]: range };
}

async function buildStudentsReport(filters = {}) {
  const query = { role: 'student', ...dateRangeFilter('createdAt', filters) };
  const students = await User.find(query).select('name email isActive createdAt');
  return {
    title: 'Students Report',
    columns: [
      { key: 'name', label: 'Name' },
      { key: 'email', label: 'Email' },
      { key: 'status', label: 'Status' },
      { key: 'joinedAt', label: 'Joined' },
    ],
    rows: students.map((s) => ({
      name: s.name,
      email: s.email,
      status: s.isActive ? 'Active' : 'Inactive',
      joinedAt: s.createdAt.toDateString(),
    })),
  };
}

async function buildCoursesReport(filters = {}) {
  const query = { ...dateRangeFilter('createdAt', filters) };
  if (filters.instructorId) query.instructor = filters.instructorId;
  if (filters.categoryId) query.category = filters.categoryId;
  if (filters.courseId) query._id = filters.courseId;

  const courses = await Course.find(query).populate('instructor', 'name').populate('category', 'name');
  const enrollmentCounts = await Enrollment.aggregate([
    { $group: { _id: '$course', count: { $sum: 1 }, completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } } } },
  ]);
  const countsByCourse = new Map(enrollmentCounts.map((e) => [e._id.toString(), e]));

  return {
    title: 'Courses Report',
    columns: [
      { key: 'title', label: 'Title' },
      { key: 'instructor', label: 'Instructor' },
      { key: 'category', label: 'Category' },
      { key: 'status', label: 'Status' },
      { key: 'enrolled', label: 'Enrolled' },
      { key: 'completionRate', label: 'Completion %' },
    ],
    rows: courses.map((c) => {
      const stats = countsByCourse.get(c._id.toString());
      return {
        title: c.title,
        instructor: c.instructor?.name || '—',
        category: c.category?.name || '—',
        status: c.status,
        enrolled: stats?.count || 0,
        completionRate: stats?.count ? Math.round((stats.completed / stats.count) * 100) : 0,
      };
    }),
  };
}

async function buildInstructorsReport() {
  const instructors = await User.find({ role: 'instructor' }).select('name email');
  const courseCounts = await Course.aggregate([{ $group: { _id: '$instructor', count: { $sum: 1 } } }]);
  const countsByInstructor = new Map(courseCounts.map((c) => [c._id.toString(), c.count]));

  return {
    title: 'Instructors Report',
    columns: [
      { key: 'name', label: 'Name' },
      { key: 'email', label: 'Email' },
      { key: 'courseCount', label: 'Courses Authored' },
    ],
    rows: instructors.map((i) => ({
      name: i.name,
      email: i.email,
      courseCount: countsByInstructor.get(i._id.toString()) || 0,
    })),
  };
}

async function buildAssessmentsReport(filters = {}) {
  const query = { ...dateRangeFilter('createdAt', filters) };
  if (filters.courseId) query.course = filters.courseId;

  const assessments = await Assessment.find(query).populate('course', 'title');
  const submissionStats = await Submission.aggregate([
    { $group: { _id: '$assessment', attempts: { $sum: 1 }, avgScore: { $avg: '$score' } } },
  ]);
  const statsByAssessment = new Map(submissionStats.map((s) => [s._id.toString(), s]));

  return {
    title: 'Assessments Report',
    columns: [
      { key: 'title', label: 'Title' },
      { key: 'course', label: 'Course' },
      { key: 'type', label: 'Type' },
      { key: 'attempts', label: 'Attempts' },
      { key: 'avgScore', label: 'Avg Score' },
    ],
    rows: assessments.map((a) => {
      const stats = statsByAssessment.get(a._id.toString());
      return {
        title: a.title,
        course: a.course?.title || '—',
        type: a.assessmentType,
        attempts: stats?.attempts || 0,
        avgScore: stats?.avgScore ? Math.round(stats.avgScore) : '—',
      };
    }),
  };
}

async function buildProgressReport(filters = {}) {
  const query = { ...dateRangeFilter('enrolledAt', filters) };
  if (filters.courseId) query.course = filters.courseId;
  if (filters.studentId) query.student = filters.studentId;

  const enrollments = await Enrollment.find(query).populate('student', 'name email').populate('course', 'title');
  return {
    title: 'Learning Progress Report',
    columns: [
      { key: 'student', label: 'Student' },
      { key: 'course', label: 'Course' },
      { key: 'status', label: 'Status' },
      { key: 'progress', label: 'Progress %' },
      { key: 'enrolledAt', label: 'Enrolled' },
    ],
    rows: enrollments.map((e) => ({
      student: e.student?.name || '—',
      course: e.course?.title || '—',
      status: e.status,
      progress: e.progressPercent,
      enrolledAt: e.enrolledAt.toDateString(),
    })),
  };
}

async function buildCertificatesReport(filters = {}) {
  const query = { ...dateRangeFilter('issuedAt', filters) };
  if (filters.courseId) query.course = filters.courseId;

  const certificates = await Certificate.find(query).populate('student', 'name').populate('course', 'title');
  return {
    title: 'Certificates Report',
    columns: [
      { key: 'certificateNumber', label: 'Certificate No.' },
      { key: 'student', label: 'Student' },
      { key: 'course', label: 'Course' },
      { key: 'issuedAt', label: 'Issued' },
      { key: 'status', label: 'Status' },
    ],
    rows: certificates.map((c) => ({
      certificateNumber: c.certificateNumber,
      student: c.student?.name || '—',
      course: c.course?.title || '—',
      issuedAt: c.issuedAt.toDateString(),
      status: c.isRevoked ? 'Revoked' : 'Valid',
    })),
  };
}

const REPORT_BUILDERS = {
  students: buildStudentsReport,
  courses: buildCoursesReport,
  instructors: buildInstructorsReport,
  assessments: buildAssessmentsReport,
  progress: buildProgressReport,
  certificates: buildCertificatesReport,
};

async function getReportData(type, filters = {}) {
  const builder = REPORT_BUILDERS[type];
  if (!builder) throw ApiError.badRequest(`Unknown report type: ${type}`);
  return builder(filters);
}

module.exports = { getReportData, REPORT_TYPES: Object.keys(REPORT_BUILDERS) };
