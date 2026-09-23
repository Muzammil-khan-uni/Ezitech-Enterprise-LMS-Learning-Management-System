const catchAsync = require('../../utils/catchAsync');
const ApiResponse = require('../../utils/ApiResponse');
const service = require('./certificates.service');

const listMine = catchAsync(async (req, res) => {
  const certificates = await service.listMyCertificates(req.user.id);
  new ApiResponse(200, certificates).send(res);
});

const getCertificate = catchAsync(async (req, res) => {
  const certificate = await service.getCertificate(req.params.certificateId, req.user);
  new ApiResponse(200, certificate).send(res);
});

const download = catchAsync(async (req, res) => {
  await service.streamCertificatePdf(req.params.certificateId, req.user, res);
});

const verify = catchAsync(async (req, res) => {
  const result = await service.verifyCertificate(req.params.code);
  new ApiResponse(200, result).send(res);
});

const revoke = catchAsync(async (req, res) => {
  const certificate = await service.revokeCertificate(req.params.certificateId, req.body.reason);
  new ApiResponse(200, certificate, 'Certificate revoked').send(res);
});

module.exports = { listMine, getCertificate, download, verify, revoke };
