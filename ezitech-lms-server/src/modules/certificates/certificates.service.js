const crypto = require('crypto');
const QRCode = require('qrcode');
const PDFDocument = require('pdfkit');

const Certificate = require('../../models/Certificate.model');
const CertificateTemplate = require('../../models/CertificateTemplate.model');
const { nextSequence } = require('../../models/Counter.model');
const { Course } = require('../../models/Course.model');
const { User } = require('../../models/User.model');
const ApiError = require('../../utils/ApiError');
const env = require('../../config/env');
const logger = require('../../utils/logger');
const notificationsService = require('../notifications/notifications.service');
const { enqueueEmail } = require('../../jobs/email.job');

function generateVerificationCode() {
  return crypto.randomBytes(16).toString('hex');
}

async function generateCertificateNumber() {
  const year = new Date().getFullYear();
  const seq = await nextSequence(`certificate:${year}`);
  return `EZI-${year}-${String(seq).padStart(6, '0')}`;
}

async function issueCertificate(studentId, courseId) {
  const existing = await Certificate.findOne({ student: studentId, course: courseId });
  if (existing) return existing;

  const template = (await CertificateTemplate.findOne({ isDefault: true })) || (await CertificateTemplate.findOne());
  if (!template) {
    logger.error('No certificate template configured - cannot issue certificate');
    return null;
  }

  const [courseInfo, studentInfo] = await Promise.all([
    Course.findById(courseId).select('title'),
    User.findById(studentId).select('name email'),
  ]);

  let certificate;
  try {
    certificate = await Certificate.create({
      student: studentId,
      course: courseId,
      courseTitle: courseInfo ? courseInfo.title : undefined,
      studentName: studentInfo ? studentInfo.name : undefined,
      template: template._id,
      certificateNumber: await generateCertificateNumber(),
      verificationCode: generateVerificationCode(),
    });
  } catch (err) {
    if (err.code === 11000) {
      const winner = await Certificate.findOne({ student: studentId, course: courseId });
      if (winner) return winner;
    }
    throw err;
  }

  const course = courseInfo;
  await notificationsService.notify(studentId, {
    type: 'certificate_issued',
    title: 'Certificate issued!',
    message: `Your certificate for ${course?.title || 'this course'} is ready to download.`,
    relatedEntityType: 'certificate',
    relatedEntityId: certificate._id,
  });

  const student = studentInfo;
  if (student) {
    await enqueueEmail('certificateIssued', student.email, {
      name: student.name,
      courseTitle: course?.title || 'your course',
      downloadUrl: `${env.clientOrigin}/my-certificates`,
    });
  }

  return certificate;
}

async function listMyCertificates(studentId) {
  return Certificate.find({ student: studentId, isRevoked: false })
    .populate('course', 'title')
    .sort('-issuedAt');
}

async function getCertificate(certificateId, requester) {
  const certificate = await Certificate.findById(certificateId)
    .populate('course', 'title')
    .populate('student', 'name email');
  if (!certificate) throw ApiError.notFound('Certificate not found');

  const isOwner = certificate.student._id.toString() === requester.id;
  const isAdmin = requester.role === 'admin';
  if (!isOwner && !isAdmin) throw ApiError.forbidden('You cannot view this certificate');

  return certificate;
}

function buildVerificationUrl(code) {
  return `${env.clientOrigin}/verify-certificate/${code}`;
}

async function verifyCertificate(code) {
  const certificate = await Certificate.findOne({ verificationCode: code })
    .populate('course', 'title')
    .populate('student', 'name');

  if (!certificate) {
    return { valid: false, reason: 'No certificate found with this code' };
  }
  if (certificate.isRevoked) {
    return { valid: false, reason: 'This certificate has been revoked' };
  }

  return {
    valid: true,
    certificateNumber: certificate.certificateNumber,
    studentName: certificate.studentName ?? certificate.student?.name ?? 'Former student',
    courseTitle: certificate.courseTitle ?? certificate.course?.title ?? 'This course is no longer available',
    issuedAt: certificate.issuedAt,
  };
}

async function revokeCertificate(certificateId, reason) {
  const certificate = await Certificate.findByIdAndUpdate(
    certificateId,
    { isRevoked: true, revokedReason: reason },
    { new: true }
  );
  if (!certificate) throw ApiError.notFound('Certificate not found');
  return certificate;
}

async function streamCertificatePdf(certificateId, requester, res) {
  const certificate = await getCertificate(certificateId, requester);
  const template = await CertificateTemplate.findById(certificate.template);

  const verificationUrl = buildVerificationUrl(certificate.verificationCode);
  const qrDataUrl = await QRCode.toDataURL(verificationUrl);
  const qrBuffer = Buffer.from(qrDataUrl.split(',')[1], 'base64');

  const doc = new PDFDocument({ layout: 'landscape', size: 'A4', margin: 50 });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${certificate.certificateNumber}.pdf"`);
  doc.pipe(res);

  const primaryColor = template?.primaryColor || '#1a237e';

  doc
    .rect(0, 0, doc.page.width, doc.page.height)
    .lineWidth(6)
    .strokeColor(primaryColor)
    .stroke();

  doc
    .fontSize(28)
    .fillColor(primaryColor)
    .text('Certificate of Completion', { align: 'center' })
    .moveDown(1.5);

  doc
    .fontSize(14)
    .fillColor('#333333')
    .text('This certifies that', { align: 'center' })
    .moveDown(0.5);

  doc
    .fontSize(24)
    .fillColor('#000000')
    .text(certificate.studentName ?? certificate.student?.name ?? 'Student', { align: 'center' })
    .moveDown(0.5);

  doc
    .fontSize(14)
    .fillColor('#333333')
    .text('has successfully completed', { align: 'center' })
    .moveDown(0.5);

  doc
    .fontSize(20)
    .fillColor(primaryColor)
    .text(certificate.courseTitle ?? certificate.course?.title ?? 'Course', { align: 'center' })
    .moveDown(1.5);

  doc
    .fontSize(11)
    .fillColor('#666666')
    .text(`Certificate No. ${certificate.certificateNumber}`, { align: 'center' })
    .text(`Issued ${certificate.issuedAt.toDateString()}`, { align: 'center' })
    .moveDown(2);

  const bottomY = doc.page.height - 150;
  doc.image(qrBuffer, doc.page.width - 150, bottomY, { width: 90 });
  doc
    .fontSize(9)
    .fillColor('#999999')
    .text('Scan to verify', doc.page.width - 150, bottomY + 95, { width: 90, align: 'center' });

  doc
    .fontSize(12)
    .fillColor('#000000')
    .text(template?.signatureName || 'Ezitech Academy', 80, bottomY + 30)
    .fontSize(9)
    .fillColor('#666666')
    .text(template?.signatureTitle || 'Director of Programs', 80, bottomY + 48);

  doc.end();
}

module.exports = {
  issueCertificate,
  listMyCertificates,
  getCertificate,
  verifyCertificate,
  revokeCertificate,
  streamCertificatePdf,
  buildVerificationUrl,
};
