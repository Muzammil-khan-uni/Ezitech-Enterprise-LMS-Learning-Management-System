const mongoose = require('mongoose');

const certificateTemplateSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    isDefault: { type: Boolean, default: false },
    primaryColor: { type: String, default: '#1a237e' },
    signatureName: { type: String, default: 'Ezitech Academy' },
    signatureTitle: { type: String, default: 'Director of Programs' },
    logoUrl: String,
    footerText: { type: String, default: 'This certifies successful completion of the course.' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('CertificateTemplate', certificateTemplateSchema);
