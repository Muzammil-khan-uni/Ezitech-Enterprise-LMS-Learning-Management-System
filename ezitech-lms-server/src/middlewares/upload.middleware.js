const multer = require('multer');
const path = require('path');
const fs = require('fs');
const ApiError = require('../utils/ApiError');

const TMP_DIR = path.join(__dirname, '..', '..', 'uploads-tmp');
if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, TMP_DIR),
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${path.extname(file.originalname)}`);
  },
});

const LIMITS_BY_KIND = {
  video: { fileSize: 200 * 1024 * 1024 },
  pdf: { fileSize: 20 * 1024 * 1024 },
  image: { fileSize: 5 * 1024 * 1024 },
  avatar: { fileSize: 5 * 1024 * 1024 },
  download: { fileSize: 50 * 1024 * 1024 },
  scorm: { fileSize: 100 * 1024 * 1024 },
};

const MIME_VALIDATORS = {
  video: (mime) => mime.startsWith('video/'),
  pdf: (mime) => mime === 'application/pdf',
  image: (mime) => mime.startsWith('image/'),
  avatar: (mime) => ['image/jpeg', 'image/png', 'image/webp'].includes(mime),
  download: () => true,
  scorm: (mime) => mime.includes('zip') || mime === 'application/octet-stream',
};

const KIND_LABELS = {
  video: 'video',
  pdf: 'PDF',
  image: 'image',
  avatar: 'image (JPG, PNG or WebP)',
  download: 'file',
  scorm: 'SCORM package (.zip)',
};

function withCode(error, code, extra = {}) {
  error.extra = { code, ...extra };
  return error;
}

function maxMbFor(kind) {
  return Math.round(((LIMITS_BY_KIND[kind] || {}).fileSize || 0) / (1024 * 1024));
}

// Turns multer's raw errors into short messages a person can act on. The `code` field lets the client
// show the message in the user's own language.
function friendlyUploadError(err, kind) {
  if (err && err.name === 'MulterError') {
    if (err.code === 'LIMIT_FILE_SIZE') {
      const maxMb = maxMbFor(kind);
      return withCode(
        new ApiError(413, `That file is too large. The maximum size for a ${KIND_LABELS[kind] || 'file'} is ${maxMb} MB.`),
        'FILE_TOO_LARGE',
        { maxMb }
      );
    }
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return withCode(ApiError.badRequest('We could not read that upload. Please choose the file again.'), 'UPLOAD_REJECTED');
    }
    return withCode(ApiError.badRequest('That file could not be uploaded. Please try a different file.'), 'UPLOAD_REJECTED');
  }
  return err;
}

function uploadMiddlewareFor(kind) {
  const validateMime = MIME_VALIDATORS[kind];
  if (!validateMime) {
    throw new Error(`Unknown upload kind: ${kind}`);
  }

  return multer({
    storage,
    limits: LIMITS_BY_KIND[kind],
    fileFilter: (req, file, cb) => {
      if (!validateMime(file.mimetype)) {
        return cb(
          withCode(
            ApiError.badRequest(`That file type is not supported. Please choose a ${KIND_LABELS[kind] || 'valid'} file.`),
            'INVALID_FILE_TYPE'
          )
        );
      }
      cb(null, true);
    },
  }).single('file');
}

module.exports = { uploadMiddlewareFor, friendlyUploadError, TMP_DIR };
