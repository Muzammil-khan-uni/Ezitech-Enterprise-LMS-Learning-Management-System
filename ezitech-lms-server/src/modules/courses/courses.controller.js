const catchAsync = require('../../utils/catchAsync');
const ApiResponse = require('../../utils/ApiResponse');
const service = require('./courses.service');

const createCourse = catchAsync(async (req, res) => {
  const course = await service.createCourse(req.body, req.user.id);
  new ApiResponse(201, course, 'Course created').send(res);
});

const getCourse = catchAsync(async (req, res) => {
  const course = await service.getCourse(req.params.courseId, req.user);
  new ApiResponse(200, course).send(res);
});

const listCourses = catchAsync(async (req, res) => {
  const { status, category, instructor, search, language, page, limit } = req.query;
  const result = await service.listCourses(
    {
      status,
      category,
      instructor,
      search,
      language,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    },
    req.user
  );
  new ApiResponse(200, result.items, undefined, result.pagination).send(res);
});

const updateCourse = catchAsync(async (req, res) => {
  const course = await service.updateCourse(req.params.courseId, req.body, req.user);
  new ApiResponse(200, course, 'Course updated').send(res);
});

const deleteCourse = catchAsync(async (req, res) => {
  await service.deleteCourse(req.params.courseId, req.user);
  new ApiResponse(200, null, 'Course deleted').send(res);
});

const setCourseStatus = catchAsync(async (req, res) => {
  const course = await service.setCourseStatus(req.params.courseId, req.body.status, req.user);
  new ApiResponse(200, course, `Course status set to ${course.status}`).send(res);
});

const addSection = catchAsync(async (req, res) => {
  const section = await service.addSection(req.params.courseId, req.body, req.user);
  new ApiResponse(201, section, 'Section added').send(res);
});

const listSections = catchAsync(async (req, res) => {
  const sections = await service.listSections(req.params.courseId, req.user);
  new ApiResponse(200, sections).send(res);
});

const reorderSections = catchAsync(async (req, res) => {
  const sections = await service.reorderSections(req.params.courseId, req.body.order, req.user);
  new ApiResponse(200, sections, 'Sections reordered').send(res);
});

const deleteSection = catchAsync(async (req, res) => {
  await service.deleteSection(req.params.courseId, req.params.sectionId, req.user);
  new ApiResponse(200, null, 'Section deleted').send(res);
});

const addLesson = catchAsync(async (req, res) => {
  const lesson = await service.addLesson(req.params.courseId, req.body, req.user);
  new ApiResponse(201, lesson, 'Lesson added').send(res);
});

const listLessons = catchAsync(async (req, res) => {
  const lessons = await service.listLessons(req.params.courseId, req.query.section, req.user);
  new ApiResponse(200, lessons).send(res);
});

const getLesson = catchAsync(async (req, res) => {
  const lesson = await service.getLessonView(req.params.courseId, req.params.lessonId, req.user);
  new ApiResponse(200, lesson).send(res);
});

const updateLesson = catchAsync(async (req, res) => {
  const lesson = await service.updateLesson(req.params.courseId, req.params.lessonId, req.body, req.user);
  new ApiResponse(200, lesson, 'Lesson updated').send(res);
});

const deleteLesson = catchAsync(async (req, res) => {
  await service.deleteLesson(req.params.courseId, req.params.lessonId, req.user);
  new ApiResponse(200, null, 'Lesson deleted').send(res);
});

const downloadOfflinePackage = catchAsync(async (req, res) => {
  await service.assertCanDownloadOffline(req.params.courseId, req.user);
  await service.streamOfflinePackage(req.params.courseId, res);
});

const listCourseMentors = catchAsync(async (req, res) => {
  const mentors = await service.listCourseMentors(req.params.courseId, req.user);
  new ApiResponse(200, mentors).send(res);
});

const setCourseMentors = catchAsync(async (req, res) => {
  const mentors = await service.setCourseMentors(req.params.courseId, req.body.mentorIds);
  new ApiResponse(200, mentors, 'Course mentors updated').send(res);
});

module.exports = {
  createCourse,
  getCourse,
  listCourses,
  updateCourse,
  deleteCourse,
  setCourseStatus,
  addSection,
  listSections,
  reorderSections,
  deleteSection,
  addLesson,
  listLessons,
  getLesson,
  updateLesson,
  deleteLesson,
  downloadOfflinePackage,
  listCourseMentors,
  setCourseMentors,
};
