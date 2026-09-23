const express = require('express');
const CertificateTemplate = require('../../models/CertificateTemplate.model');
const catchAsync = require('../../utils/catchAsync');
const ApiResponse = require('../../utils/ApiResponse');
const ApiError = require('../../utils/ApiError');
const requireAuth = require('../../middlewares/auth.middleware');
const { authorize } = require('../../middlewares/rbac.middleware');
const validate = require('../../middlewares/validate.middleware');
const schemas = require('./certificate-templates.validation');

const router = express.Router();

router.use(requireAuth, authorize('admin'));

router.get(
  '/',
  catchAsync(async (req, res) => {
    const templates = await CertificateTemplate.find().sort('-isDefault');
    new ApiResponse(200, templates).send(res);
  })
);

router.post(
  '/',
  validate(schemas.createTemplate),
  catchAsync(async (req, res) => {
    const { name, primaryColor, signatureName, signatureTitle, logoUrl, footerText, isDefault } = req.body;

    if (isDefault) {
      await CertificateTemplate.updateMany({}, { isDefault: false });
    }

    const template = await CertificateTemplate.create({
      name,
      primaryColor,
      signatureName,
      signatureTitle,
      logoUrl,
      footerText,
      isDefault: !!isDefault,
      createdBy: req.user.id,
    });
    new ApiResponse(201, template, 'Template created').send(res);
  })
);

router.patch(
  '/:templateId',
  validate(schemas.updateTemplate),
  catchAsync(async (req, res) => {
    if (req.body.isDefault) {
      await CertificateTemplate.updateMany({}, { isDefault: false });
    }
    const template = await CertificateTemplate.findByIdAndUpdate(req.params.templateId, req.body, {
      new: true,
      runValidators: true,
    });
    if (!template) throw ApiError.notFound('Template not found');
    new ApiResponse(200, template, 'Template updated').send(res);
  })
);

router.delete(
  '/:templateId',
  catchAsync(async (req, res) => {
    const result = await CertificateTemplate.deleteOne({ _id: req.params.templateId });
    if (result.deletedCount === 0) throw ApiError.notFound('Template not found');
    new ApiResponse(200, null, 'Template deleted').send(res);
  })
);

module.exports = router;
