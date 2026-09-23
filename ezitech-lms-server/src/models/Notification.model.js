const mongoose = require('mongoose');

const NOTIFICATION_TYPES = [
  'course_enrollment',
  'assignment_deadline',
  'quiz_alert',
  'announcement',
  'certificate_issued',
  'course_update',
];

const notificationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: { type: String, enum: NOTIFICATION_TYPES, required: true },
    title: { type: String, required: true, maxlength: 200 },
    message: { type: String, maxlength: 1000 },
    relatedEntityType: String,
    relatedEntityId: mongoose.Schema.Types.ObjectId,
    isRead: { type: Boolean, default: false },
  },
  { timestamps: true }
);

notificationSchema.index({ user: 1, isRead: 1, createdAt: -1 });

module.exports = { Notification: mongoose.model('Notification', notificationSchema), NOTIFICATION_TYPES };
