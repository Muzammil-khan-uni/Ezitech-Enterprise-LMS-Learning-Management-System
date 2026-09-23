const express = require('express');
const catchAsync = require('../../utils/catchAsync');
const ApiResponse = require('../../utils/ApiResponse');
const ApiError = require('../../utils/ApiError');
const requireAuth = require('../../middlewares/auth.middleware');
const { authorize } = require('../../middlewares/rbac.middleware');
const { uploadMiddlewareFor, friendlyUploadError } = require('../../middlewares/upload.middleware');
const { uploadToCloudinary } = require('./uploads.service');

const router = express.Router();

const CONTENT_CREATORS = ['instructor', 'course_manager', 'admin'];

router.use(requireAuth, authorize(...CONTENT_CREATORS));

function registerUploadRoute(kind, folder) {
  router.post(
    `/${kind}`,
    (req, res, next) => {
      uploadMiddlewareFor(kind)(req, res, (err) => {
        if (err) return next(friendlyUploadError(err, kind));
        next();
      });
    },
    catchAsync(async (req, res) => {
      if (!req.file) throw ApiError.badRequest('No file was provided (expected form field "file")');
      const result = await uploadToCloudinary(kind, req.file.path, folder);
      new ApiResponse(201, result, 'File uploaded').send(res);
    })
  );
}

registerUploadRoute('video', 'videos');
registerUploadRoute('pdf', 'documents');
registerUploadRoute('image', 'images');
registerUploadRoute('download', 'downloads');

module.exports = router;
