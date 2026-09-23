const express = require('express');
const Joi = require('joi');
const catchAsync = require('../../utils/catchAsync');
const ApiResponse = require('../../utils/ApiResponse');
const ApiError = require('../../utils/ApiError');
const requireAuth = require('../../middlewares/auth.middleware');
const { authorize } = require('../../middlewares/rbac.middleware');
const validate = require('../../middlewares/validate.middleware');
const { uploadMiddlewareFor, friendlyUploadError } = require('../../middlewares/upload.middleware');
const env = require('../../config/env');
const service = require('./scorm.service');

const router = express.Router();

const CONTENT_CREATORS = ['instructor', 'course_manager', 'admin'];

const commitSchema = Joi.object({
  lessonStatus: Joi.string()
    .valid('passed', 'completed', 'failed', 'incomplete', 'browsed', 'not attempted')
    .optional(),
  scoreRaw: Joi.number().min(0).max(100).optional(),
  lessonLocation: Joi.string().max(1000).allow('').optional(),
  suspendData: Joi.string().max(8192).allow('').optional(),
  sessionTime: Joi.string().max(20).allow('').optional(),
}).min(1);

function requireScormHost(req, res, next) {
  if (!env.scormContentOrigin) return next(ApiError.notFound('Not found'));
  const expected = new URL(env.scormContentOrigin).hostname.toLowerCase();
  const requested = String(req.headers.host || '').split(':')[0].toLowerCase();
  if (requested !== expected) return next(ApiError.notFound('Not found'));
  return next();
}

function applyContentHeaders(req, res, next) {
  res.removeHeader('X-Frame-Options');
  res.set(
    'Content-Security-Policy',
    [
      "default-src 'self' data: blob: https:",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' blob: https:",
      "style-src 'self' 'unsafe-inline' https:",
      'img-src * data: blob:',
      'media-src * data: blob:',
      'font-src * data:',
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      `frame-ancestors ${env.clientOrigin.replace(/\/$/, '')}`,
    ].join('; ')
  );
  res.set('Cross-Origin-Resource-Policy', 'cross-origin');
  res.set('Referrer-Policy', 'no-referrer');
  next();
}

router.get(
  '/player/:token',
  requireScormHost,
  applyContentHeaders,
  catchAsync(async (req, res) => {
    const html = service.renderPlayerHtml(req.params.token);
    res.set('Content-Type', 'text/html; charset=utf-8');
    res.set('Cache-Control', 'no-store');
    res.send(html);
  })
);

router.get(
  '/packages/:token/*filePath',
  requireScormHost,
  applyContentHeaders,
  catchAsync(async (req, res) => {
    const { data, contentType } = await service.getPackageEntry(req.params.token, req.params.filePath);
    res.set('Content-Type', contentType);
    res.set('Cache-Control', 'private, max-age=3600');
    res.send(data);
  })
);

router.use(requireAuth);

router.get(
  '/courses/:courseId/lessons/:lessonId/launch',
  catchAsync(async (req, res) => {
    const launch = await service.createLaunch(req.user, req.params.courseId, req.params.lessonId);
    new ApiResponse(200, launch).send(res);
  })
);

router.get(
  '/courses/:courseId/lessons/:lessonId/data',
  catchAsync(async (req, res) => {
    const data = await service.getData(req.user.id, req.params.lessonId);
    new ApiResponse(200, data).send(res);
  })
);

router.patch(
  '/courses/:courseId/lessons/:lessonId/data',
  validate(commitSchema),
  catchAsync(async (req, res) => {
    const record = await service.commitData(req.user.id, req.params.courseId, req.params.lessonId, req.body);
    new ApiResponse(200, record, 'SCORM data committed').send(res);
  })
);

router.post(
  '/packages',
  authorize(...CONTENT_CREATORS),
  (req, res, next) => {
    uploadMiddlewareFor('scorm')(req, res, (err) => {
      if (err) return next(friendlyUploadError(err, 'scorm'));
      next();
    });
  },
  catchAsync(async (req, res) => {
    if (!req.file) throw ApiError.badRequest('No file was provided (expected form field "file")');
    const result = await service.uploadPackage(req.file.path);
    new ApiResponse(201, result, 'SCORM package uploaded').send(res);
  })
);

module.exports = router;
