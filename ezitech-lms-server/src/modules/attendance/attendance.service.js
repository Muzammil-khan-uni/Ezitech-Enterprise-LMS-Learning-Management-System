const Attendance = require('../../models/Attendance.model');
const ApiError = require('../../utils/ApiError');

async function recordJoin(studentId, liveSessionId, courseId) {
  const now = new Date();
  await Attendance.findOneAndUpdate(
    { student: studentId, liveSession: liveSessionId },
    {
      $setOnInsert: { student: studentId, liveSession: liveSessionId, course: courseId, joinedAt: now },
      $set: { currentSegmentStartedAt: now, isPresent: true },
    },
    { upsert: true }
  );
}

async function recordLeave(studentId, liveSessionId) {
  const record = await Attendance.findOne({ student: studentId, liveSession: liveSessionId });
  if (!record || !record.isPresent || !record.currentSegmentStartedAt) return;

  const segmentSeconds = Math.round((Date.now() - record.currentSegmentStartedAt.getTime()) / 1000);
  record.durationSeconds += Math.max(0, segmentSeconds);
  record.leftAt = new Date();
  record.isPresent = false;
  record.currentSegmentStartedAt = undefined;
  await record.save();
}

async function listMyAttendance(studentId) {
  return Attendance.find({ student: studentId })
    .populate('liveSession', 'title scheduledAt')
    .populate('course', 'title')
    .sort('-joinedAt');
}

async function listSessionAttendance(liveSessionId, reqUser) {
  const { LiveSession } = require('../../models/LiveSession.model');
  const session = await LiveSession.findById(liveSessionId);
  if (!session) throw ApiError.notFound('Live session not found');

  const isInstructor = session.instructor.toString() === reqUser.id;
  if (!isInstructor) {
    const access = await require('../../utils/courseAccess').getAccess(session.course, reqUser);
    if (!access.canModerate) {
      throw ApiError.forbidden('You cannot view attendance for this session');
    }
  }

  return Attendance.find({ liveSession: liveSessionId }).populate('student', 'name email').sort('-durationSeconds');
}

module.exports = { recordJoin, recordLeave, listMyAttendance, listSessionAttendance };
