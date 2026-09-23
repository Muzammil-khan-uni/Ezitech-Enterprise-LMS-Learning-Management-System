const crypto = require('crypto');
const AdmZip = require('adm-zip');
const mime = require('mime-types');
const fs = require('fs/promises');
const ScormProgress = require('../../models/ScormProgress.model');
const { Lesson } = require('../../models/Lesson.model');
const { Enrollment } = require('../../models/Enrollment.model');
const ApiError = require('../../utils/ApiError');
const env = require('../../config/env');
const { uploadToCloudinary } = require('../uploads/uploads.service');
const progressService = require('../progress/progress.service');
const coursesService = require('../courses/courses.service');
const { User } = require('../../models/User.model');

const MANIFEST_FILENAME = 'imsmanifest.xml';

const COMPLETING_STATUSES = new Set(['completed', 'passed']);

async function getData(studentId, lessonId) {
  const record = await ScormProgress.findOne({ student: studentId, lesson: lessonId });
  return (
    record || {
      lessonStatus: 'not attempted',
      scoreRaw: null,
      lessonLocation: '',
      suspendData: '',
      sessionTime: '',
    }
  );
}

async function commitData(studentId, courseId, lessonId, data) {
  const lesson = await Lesson.findOne({ _id: lessonId, course: courseId });
  if (!lesson || lesson.lessonType !== 'scorm') {
    throw ApiError.badRequest('This lesson is not a SCORM lesson');
  }

  const enrollment = await Enrollment.findOne({ student: studentId, course: courseId, status: { $ne: 'dropped' } });
  if (!enrollment) throw ApiError.forbidden('You must be enrolled in this course to track SCORM progress');

  const wasAlreadyCompleting = await ScormProgress.exists({
    student: studentId,
    lesson: lessonId,
    lessonStatus: { $in: [...COMPLETING_STATUSES] },
  });

  const record = await ScormProgress.findOneAndUpdate(
    { student: studentId, lesson: lessonId },
    {
      student: studentId,
      lesson: lessonId,
      course: courseId,
      ...data,
      lastCommittedAt: new Date(),
    },
    { upsert: true, new: true, runValidators: true }
  );

  if (!wasAlreadyCompleting && COMPLETING_STATUSES.has(record.lessonStatus)) {
    await progressService.markLessonComplete(studentId, courseId, lessonId, { verified: true });
  }

  return record;
}

async function createLaunch(reqUser, courseId, lessonId) {
  const lesson = await coursesService.getLessonForStudy(courseId, lessonId, reqUser);
  if (lesson.lessonType !== 'scorm') {
    throw ApiError.badRequest('This lesson is not a SCORM lesson');
  }
  if (!env.scormContentOrigin) {
    throw new ApiError(
      503,
      'SCORM playback is not configured on this server. Set SCORM_CONTENT_ORIGIN to a separate hostname.'
    );
  }

  const { url, folder } = decodePackageToken(packageTokenFromUrl(lesson.packageUrl));
  const entry = assertSafeEntryPoint(lesson.entryPoint);
  const launchToken = signLaunchToken({ url, folder, entry });

  const [progress, learner] = await Promise.all([
    getData(reqUser.id, lessonId),
    User.findById(reqUser.id).select('name'),
  ]);

  return {
    playerUrl: `${env.scormContentOrigin}/api/${env.apiVersion}/scorm/player/${launchToken}`,
    contentOrigin: env.scormContentOrigin,
    progress,
    learner: { id: reqUser.id, name: learner ? learner.name : '' },
  };
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderPlayerHtml(token) {
  const { entry } = decodeLaunchToken(token);
  const contentSrc = `/api/${env.apiVersion}/scorm/packages/${token}/${encodeURI(entry).replace(/#/g, '%23')}`;
  const config = JSON.stringify({ hostOrigin: env.clientOrigin.replace(/\/$/, ''), contentSrc }).replace(/</g, '\\u003c');

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<meta name="referrer" content="no-referrer">
<title>${escapeHtml('SCORM player')}</title>
<style>html,body{margin:0;height:100%;background:#fff}iframe{border:0;width:100%;height:100%;display:block}</style>
</head>
<body>
<iframe id="content" title="SCORM content" allow="fullscreen" allowfullscreen></iframe>
<script>
(function () {
  var config = ${config};
  var cmi = {};
  var dirty = false;
  var started = false;
  var lastError = '0';
  var stateTimer = null;
  var readyTimer = null;

  function send(type, payload) {
    try {
      window.parent.postMessage({ source: 'ezitech-scorm', type: type, payload: payload }, config.hostOrigin);
    } catch (e) {}
  }

  function snapshot() {
    return {
      lessonStatus: cmi['cmi.core.lesson_status'],
      scoreRaw: cmi['cmi.core.score.raw'],
      lessonLocation: cmi['cmi.core.lesson_location'],
      suspendData: cmi['cmi.suspend_data'],
      sessionTime: cmi['cmi.core.session_time']
    };
  }

  function queueState() {
    dirty = true;
    clearTimeout(stateTimer);
    stateTimer = setTimeout(function () { send('state', snapshot()); }, 400);
  }

  function commit() {
    clearTimeout(stateTimer);
    send('commit', snapshot());
    dirty = false;
    return 'true';
  }

  window.API = {
    LMSInitialize: function () { lastError = '0'; return 'true'; },
    LMSFinish: function () { return commit(); },
    LMSGetValue: function (key) {
      lastError = '0';
      return Object.prototype.hasOwnProperty.call(cmi, key) ? String(cmi[key]) : '';
    },
    LMSSetValue: function (key, value) {
      lastError = '0';
      cmi[key] = String(value);
      queueState();
      return 'true';
    },
    LMSCommit: function () { return commit(); },
    LMSGetLastError: function () { return lastError; },
    LMSGetErrorString: function () { return lastError === '0' ? 'No error' : 'General exception'; },
    LMSGetDiagnostic: function () { return ''; }
  };

  window.addEventListener('message', function (event) {
    if (event.source !== window.parent || event.origin !== config.hostOrigin) return;
    var message = event.data;
    if (!message || message.source !== 'ezitech-scorm-host' || message.type !== 'init' || started) return;
    started = true;
    clearInterval(readyTimer);
    cmi = message.payload && typeof message.payload.cmi === 'object' && message.payload.cmi ? message.payload.cmi : {};
    document.getElementById('content').src = config.contentSrc;
  });

  window.addEventListener('pagehide', function () { if (dirty) commit(); });

  var attempts = 0;
  send('ready');
  readyTimer = setInterval(function () {
    attempts += 1;
    if (started || attempts > 40) { clearInterval(readyTimer); return; }
    send('ready');
  }, 500);
})();
</script>
</body>
</html>`;
}

function assetUrlFromPackageUrl(packageUrl) {
  try {
    return decodePackageToken(packageTokenFromUrl(packageUrl)).url;
  } catch {
    return null;
  }
}

module.exports = {
  assetUrlFromPackageUrl,
  getData,
  commitData,
  uploadPackage,
  getPackageEntry,
  createLaunch,
  renderPlayerHtml,
  signLaunchToken,
  signPackageToken,
};

function findManifestEntryPoint(zip) {
  const manifestEntry = zip
    .getEntries()
    .find((e) => e.entryName.toLowerCase() === MANIFEST_FILENAME || e.entryName.toLowerCase().endsWith(`/${MANIFEST_FILENAME}`));

  if (!manifestEntry) {
    throw ApiError.badRequest(`Not a valid SCORM package - ${MANIFEST_FILENAME} was not found in the zip`);
  }

  const xml = manifestEntry.getData().toString('utf8');
  const match = xml.match(/<resource\b[^>]*\bhref\s*=\s*"([^"]+)"/i);
  const suggestedEntryPoint = match ? match[1] : 'index.html';

  const lastSlash = manifestEntry.entryName.lastIndexOf('/');
  const manifestFolder = lastSlash === -1 ? '' : manifestEntry.entryName.slice(0, lastSlash + 1);

  return { suggestedEntryPoint, manifestFolder };
}

async function uploadPackage(localFilePath) {
  let zip;
  try {
    zip = new AdmZip(localFilePath);
  } catch {
    await fs.unlink(localFilePath).catch(() => {});
    throw ApiError.badRequest('The uploaded file is not a valid zip archive');
  }

  let manifestInfo;
  try {
    manifestInfo = findManifestEntryPoint(zip);
  } catch (err) {
    await fs.unlink(localFilePath).catch(() => {});
    throw err;
  }

  try {
    assertSafeEntryPoint(manifestInfo.suggestedEntryPoint);
  } catch (err) {
    await fs.unlink(localFilePath).catch(() => {});
    throw err;
  }

  const upload = await uploadToCloudinary('scorm', localFilePath, 'scorm-packages');

  const token = signPackageToken({ url: upload.url, folder: manifestInfo.manifestFolder });
  const baseUrl = env.scormContentOrigin || env.serverPublicUrl;
  const packageUrl = `${baseUrl}/api/${env.apiVersion}/scorm/packages/${token}`;

  return { packageUrl, entryPoint: manifestInfo.suggestedEntryPoint, scormVersion: '1.2' };
}

const packageCache = new Map();
const CACHE_TTL_MS = 10 * 60 * 1000;
const CACHE_MAX_ENTRIES = 20;
const LAUNCH_TOKEN_TTL_MS = 8 * 60 * 60 * 1000;

function currentKey() {
  return crypto.createHmac('sha256', env.jwt.accessSecret).update('scorm-package-token-v2').digest();
}

function legacyKey() {
  return env.jwt.accessSecret;
}

function signWith(key, payload) {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createHmac('sha256', key).update(body).digest('base64url');
  return `${body}.${signature}`;
}

function verifyWith(key, token) {
  const [body, signature, ...rest] = String(token).split('.');
  if (!body || !signature || rest.length > 0) return null;

  const expected = crypto.createHmac('sha256', key).update(body).digest('base64url');
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (
    signatureBuffer.length !== expectedBuffer.length ||
    !crypto.timingSafeEqual(signatureBuffer, expectedBuffer)
  ) {
    return null;
  }

  try {
    return JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
  } catch {
    return null;
  }
}

function invalidReference() {
  return ApiError.badRequest('Invalid SCORM package reference');
}

function signPackageToken({ url, folder }) {
  return signWith(currentKey(), { purpose: 'package', url, folder });
}

function decodePackageToken(token) {
  const payload = verifyWith(currentKey(), token) || verifyWith(legacyKey(), token);
  if (!payload) throw invalidReference();
  if (payload.purpose && payload.purpose !== 'package') throw invalidReference();
  assertFetchableAssetUrl(payload.url);
  return payload;
}

function signLaunchToken({ url, folder, entry, ttlMs = LAUNCH_TOKEN_TTL_MS }) {
  return signWith(currentKey(), { purpose: 'launch', url, folder, entry, exp: Date.now() + ttlMs });
}

function decodeLaunchToken(token) {
  const payload = verifyWith(currentKey(), token);
  if (!payload || payload.purpose !== 'launch') throw invalidReference();
  if (typeof payload.exp !== 'number' || payload.exp < Date.now()) {
    throw new ApiError(410, 'This SCORM session has expired - reopen the lesson');
  }
  assertFetchableAssetUrl(payload.url);
  return payload;
}

const ALLOWED_ASSET_HOSTNAMES = ['res.cloudinary.com'];

function assertFetchableAssetUrl(rawUrl) {
  let parsed;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw invalidReference();
  }

  if (parsed.protocol !== 'https:' || !ALLOWED_ASSET_HOSTNAMES.includes(parsed.hostname)) {
    throw invalidReference();
  }
}

const SAFE_ENTRY_POINT = /^(?![a-z][a-z0-9+.-]*:)(?!\/)(?!.*(^|\/)\.\.(\/|$|\?|#))[^\s"'<>\\]+$/i;

function assertSafeEntryPoint(entryPoint) {
  if (typeof entryPoint !== 'string' || !SAFE_ENTRY_POINT.test(entryPoint)) {
    throw ApiError.badRequest('This SCORM package has an unusable entry point');
  }
  return entryPoint;
}

function packageTokenFromUrl(packageUrl) {
  const marker = '/scorm/packages/';
  const index = String(packageUrl).indexOf(marker);
  if (index === -1) throw invalidReference();
  return String(packageUrl).slice(index + marker.length).replace(/\/+$/, '');
}

async function getCachedZip(token, sourceUrl) {
  const cached = packageCache.get(token);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.zip;
  }

  const response = await fetch(sourceUrl);
  if (!response.ok) {
    throw ApiError.notFound('SCORM package could not be retrieved');
  }
  const zip = new AdmZip(Buffer.from(await response.arrayBuffer()));

  if (packageCache.size >= CACHE_MAX_ENTRIES) {
    const oldestToken = [...packageCache.entries()].sort((a, b) => a[1].fetchedAt - b[1].fetchedAt)[0][0];
    packageCache.delete(oldestToken);
  }
  packageCache.set(token, { zip, fetchedAt: Date.now() });
  return zip;
}

async function getPackageEntry(token, requestedPathSegments) {
  const { url, folder } = decodeLaunchToken(token);
  const zip = await getCachedZip(url, url);

  const requestedPath = requestedPathSegments.join('/');
  const entryName = `${folder}${requestedPath}`;
  const entry = zip.getEntry(entryName);
  if (!entry || entry.isDirectory) {
    throw ApiError.notFound('File not found in this SCORM package');
  }

  return {
    data: entry.getData(),
    contentType: mime.lookup(entryName) || 'application/octet-stream',
  };
}
