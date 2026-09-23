const { Notification } = require('../../models/Notification.model');
const { emitToUser, emitToUsers } = require('../../sockets');
const ApiError = require('../../utils/ApiError');

async function notify(userId, { type, title, message, relatedEntityType, relatedEntityId }) {
  const notification = await Notification.create({
    user: userId,
    type,
    title,
    message,
    relatedEntityType,
    relatedEntityId,
  });

  emitToUser(userId, 'notification:new', notification);
  return notification;
}

async function notifyEnrolledStudents(courseId, payload) {
  const { Enrollment } = require('../../models/Enrollment.model');
  const enrollments = await Enrollment.find({ course: courseId, status: { $ne: 'dropped' } }).select('student');
  if (enrollments.length === 0) return;

  const studentIds = enrollments.map((e) => e.student);
  const { type, title, message, relatedEntityType, relatedEntityId } = payload;

  await Notification.insertMany(
    studentIds.map((studentId) => ({
      user: studentId,
      type,
      title,
      message,
      relatedEntityType,
      relatedEntityId,
    }))
  );

  emitToUsers(studentIds, 'notification:new', payload);
}

async function listMine(userId, { unreadOnly = false, page = 1, limit = 20 } = {}) {
  const filter = { user: userId };
  if (unreadOnly) filter.isRead = false;

  const skip = (page - 1) * limit;
  const [items, total, unreadCount] = await Promise.all([
    Notification.find(filter).skip(skip).limit(limit).sort('-createdAt'),
    Notification.countDocuments(filter),
    Notification.countDocuments({ user: userId, isRead: false }),
  ]);

  return { items, unreadCount, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
}

async function markRead(userId, notificationId) {
  const notification = await Notification.findOneAndUpdate(
    { _id: notificationId, user: userId },
    { isRead: true },
    { new: true }
  );
  if (!notification) throw ApiError.notFound('Notification not found');
  return notification;
}

async function markAllRead(userId) {
  await Notification.updateMany({ user: userId, isRead: false }, { isRead: true });
}

module.exports = { notify, notifyEnrolledStudents, listMine, markRead, markAllRead };
