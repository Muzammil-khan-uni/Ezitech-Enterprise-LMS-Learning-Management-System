const mongoose = require('mongoose');

const certificateSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
    template: { type: mongoose.Schema.Types.ObjectId, ref: 'CertificateTemplate', required: true },

    courseTitle: String,
    studentName: String,

    certificateNumber: { type: String, required: true, unique: true },
    verificationCode: { type: String, required: true, unique: true, index: true },

    issuedAt: { type: Date, default: Date.now },
    isRevoked: { type: Boolean, default: false },
    revokedReason: String,
  },
  { timestamps: true }
);

certificateSchema.index({ student: 1, course: 1 }, { unique: true });

module.exports = mongoose.model('Certificate', certificateSchema);
