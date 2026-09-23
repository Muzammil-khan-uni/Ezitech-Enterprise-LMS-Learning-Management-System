const { Lesson } = require('../models/Lesson.model');
const { Course } = require('../models/Course.model');
const { deleteAsset } = require('../modules/uploads/uploads.service');
const logger = require('./logger');

const KIND_BY_RESOURCE_TYPE = { image: 'image', video: 'video', raw: 'download' };

function parseCloudinaryUrl(rawUrl) {
  try {
    const url = new URL(rawUrl);
    if (url.hostname !== 'res.cloudinary.com') return null;
    const match = url.pathname.match(/^\/[^/]+\/(image|video|raw)\/upload\/(?:v\d+\/)?(.+)$/);
    if (!match) return null;
    let publicId = decodeURIComponent(match[2]);
    if (match[1] !== 'raw') publicId = publicId.replace(/\.[^./]+$/, '');
    return { kind: KIND_BY_RESOURCE_TYPE[match[1]], publicId };
  } catch {
    return null;
  }
}

async function stillReferenced(url) {
  const [lesson, course] = await Promise.all([
    Lesson.exists({ $or: [{ videoUrl: url }, { fileUrl: url }] }),
    Course.exists({ thumbnailUrl: url }),
  ]);
  return Boolean(lesson || course);
}

async function releaseAssets(urls) {
  if (process.env.NODE_ENV === 'test') return;

  const unique = [...new Set(urls.filter(Boolean))];
  for (const url of unique) {
    const asset = parseCloudinaryUrl(url);
    if (!asset) continue;
    try {
      if (await stillReferenced(url)) continue;
      await deleteAsset(asset.publicId, asset.kind);
    } catch (err) {
      logger.warn(`Could not delete stored file ${asset.publicId}: ${err.message}`);
    }
  }
}

function lessonAssetUrls(lessons, scormAssetUrl) {
  const urls = [];
  for (const lesson of lessons) {
    if (lesson.videoUrl) urls.push(lesson.videoUrl);
    if (lesson.fileUrl) urls.push(lesson.fileUrl);
    if (lesson.lessonType === 'scorm' && lesson.packageUrl) {
      const zipUrl = scormAssetUrl(lesson.packageUrl);
      if (zipUrl) urls.push(zipUrl);
    }
  }
  return urls;
}

module.exports = { parseCloudinaryUrl, releaseAssets, lessonAssetUrls };
