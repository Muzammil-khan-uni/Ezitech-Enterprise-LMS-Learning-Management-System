const catchAsync = require('../../utils/catchAsync');
const ApiResponse = require('../../utils/ApiResponse');
const service = require('./assessments.service');

const createAssessment = catchAsync(async (req, res) => {
  const assessment = await service.createAssessment(req.body, req.user);
  new ApiResponse(201, assessment, 'Assessment created').send(res);
});

const getAssessment = catchAsync(async (req, res) => {
  const assessment = await service.getAssessmentForUser(req.params.assessmentId, req.user);
  new ApiResponse(200, assessment).send(res);
});

const listForCourse = catchAsync(async (req, res) => {
  const assessments = await service.listAssessmentsForUser(req.params.courseId, req.user);
  new ApiResponse(200, assessments).send(res);
});

const updateAssessment = catchAsync(async (req, res) => {
  const assessment = await service.updateAssessment(req.params.assessmentId, req.body, req.user);
  new ApiResponse(200, assessment, 'Assessment updated').send(res);
});

const deleteAssessment = catchAsync(async (req, res) => {
  await service.deleteAssessment(req.params.assessmentId, req.user);
  new ApiResponse(200, null, 'Assessment deleted').send(res);
});

const startAttempt = catchAsync(async (req, res) => {
  const result = await service.startAttempt(req.params.assessmentId, req.user.id);
  new ApiResponse(201, result, 'Attempt started').send(res);
});

const submitAttempt = catchAsync(async (req, res) => {
  const submission = await service.submitAttempt(req.params.submissionId, req.body, req.user.id);
  new ApiResponse(200, submission, 'Submission recorded').send(res);
});

const gradeSubmission = catchAsync(async (req, res) => {
  const submission = await service.gradeSubmission(req.params.submissionId, req.body, req.user);
  new ApiResponse(200, submission, 'Submission graded').send(res);
});

const listMySubmissions = catchAsync(async (req, res) => {
  const submissions = await service.listMySubmissions(req.user.id, req.params.assessmentId);
  new ApiResponse(200, submissions).send(res);
});

const listForGrading = catchAsync(async (req, res) => {
  const submissions = await service.listSubmissionsForGrading(
    req.params.assessmentId,
    { pendingOnly: req.query.pendingOnly !== 'false' },
    req.user
  );
  new ApiResponse(200, submissions).send(res);
});

module.exports = {
  createAssessment,
  getAssessment,
  listForCourse,
  updateAssessment,
  deleteAssessment,
  startAttempt,
  submitAttempt,
  gradeSubmission,
  listMySubmissions,
  listForGrading,
};
