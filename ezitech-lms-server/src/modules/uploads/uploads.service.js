const fs = require('fs/promises');
const { cloudinary, isConfigured } = require('../../config/cloudinary');
const ApiError = require('../../utils/ApiError');
const logger = require('../../utils/logger');

const RESOURCE_TYPE_BY_KIND = {
  video: 'video',
  pdf: 'raw',
  image: 'image',
  avatar: 'image',
  download: 'raw',
  scorm: 'raw',
};

async function uploadToCloudinary(kind, localFilePath, folder, extraOptions = {}) {
  if (!isConfigured()) {
    await fs.unlink(localFilePath).catch(() => {});
    const unavailable = ApiError.internal('File uploads are not available right now. Please contact your administrator.');
    unavailable.extra = { code: 'UPLOADS_UNAVAILABLE' };
    throw unavailable;
  }

  try {
    const result = await cloudinary.uploader.upload(localFilePath, {
      resource_type: RESOURCE_TYPE_BY_KIND[kind],
      folder: `ezitech-lms/${folder}`,
      use_filename: true,
      unique_filename: true,
      ...extraOptions,
    });

    return {
      url: result.secure_url,
      publicId: result.public_id,
      bytes: result.bytes,
      format: result.format,
      durationSeconds: result.duration ? Math.round(result.duration) : undefined,
    };
  } catch (error) {
    logger.error(`Cloudinary upload failed (${kind}): ${error.message}`);
    const failed = new ApiError(502, 'We could not process that file. Please try again or use a different file.', false);
    failed.extra = { code: 'UPLOAD_FAILED' };
    throw failed;
  } finally {
    await fs.unlink(localFilePath).catch((err) => {
      logger.warn(`Failed to clean up temp upload file ${localFilePath}: ${err.message}`);
    });
  }
}

async function deleteAsset(publicId, kind) {
  if (!isConfigured() || !publicId) return;
  await cloudinary.uploader.destroy(publicId, { resource_type: RESOURCE_TYPE_BY_KIND[kind] || 'image' });
}

module.exports = { uploadToCloudinary, deleteAsset };
