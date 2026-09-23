const logger = require('../utils/logger');
const attendanceService = require('../modules/attendance/attendance.service');

const SIGNAL_TYPES = ['offer', 'answer', 'ice-candidate'];
const MAX_SIGNAL_BYTES = 32 * 1024;

function isValidSignal(signal) {
  if (!signal || typeof signal !== 'object' || !SIGNAL_TYPES.includes(signal.type)) return false;
  try {
    return JSON.stringify(signal).length <= MAX_SIGNAL_BYTES;
  } catch {
    return false;
  }
}

function registerLiveClassHandlers(io, socket) {
  socket.on('live:join', async ({ roomId }, ack) => {
    try {
      const { LiveSession } = require('../models/LiveSession.model');
      const { Enrollment } = require('../models/Enrollment.model');

      const session = await LiveSession.findOne({ roomId });
      if (!session) return ack?.({ error: 'Live session not found' });
      if (session.status !== 'live') return ack?.({ error: 'This session is not currently live' });

      const isInstructor = session.instructor.toString() === socket.userId;
      const isStaff = ['admin', 'course_manager', 'mentor'].includes(socket.userRole);
      if (!isInstructor && !isStaff) {
        const enrollment = await Enrollment.findOne({
          student: socket.userId,
          course: session.course,
          status: { $ne: 'dropped' },
        });
        if (!enrollment) return ack?.({ error: 'You are not enrolled in this course' });
      }

      const roomName = `live:${roomId}`;
      const existingPeers = Array.from(io.sockets.adapter.rooms.get(roomName) || []).filter(
        (id) => id !== socket.id
      );

      socket.join(roomName);
      socket.liveRoomId = roomId;
      socket.liveSessionId = session._id.toString();
      socket.isAttendanceTracked = !isInstructor && !isStaff;

      if (socket.isAttendanceTracked) {
        await attendanceService.recordJoin(socket.userId, session._id, session.course);
      }

      ack?.({ peers: existingPeers });
      socket.to(roomName).emit('live:peer-joined', { socketId: socket.id, userId: socket.userId });

      logger.info(`Socket ${socket.id} (user ${socket.userId}) joined live room ${roomId}`);
    } catch (err) {
      logger.error(`live:join failed: ${err.message}`);
      ack?.({ error: 'Could not join the live session' });
    }
  });

  socket.on('live:signal', async ({ targetSocketId, signal } = {}) => {
    if (!socket.liveRoomId || typeof targetSocketId !== 'string') return;
    if (!isValidSignal(signal)) return;

    const roomName = `live:${socket.liveRoomId}`;
    const localRoom = io.sockets.adapter.rooms.get(roomName);
    let isPeer = Boolean(localRoom && localRoom.has(targetSocketId));
    if (!isPeer) {
      const remote = await io.in(roomName).fetchSockets();
      isPeer = remote.some((peer) => peer.id === targetSocketId);
    }
    if (!isPeer || targetSocketId === socket.id) return;

    io.to(targetSocketId).emit('live:signal', { fromSocketId: socket.id, signal });
  });

  socket.on('live:leave', async () => {
    if (!socket.liveRoomId) return;
    const roomName = `live:${socket.liveRoomId}`;
    socket.to(roomName).emit('live:peer-left', { socketId: socket.id });
    socket.leave(roomName);

    if (socket.isAttendanceTracked && socket.liveSessionId) {
      await attendanceService.recordLeave(socket.userId, socket.liveSessionId).catch((err) => {
        logger.error(`Failed to record attendance leave: ${err.message}`);
      });
    }

    socket.liveRoomId = null;
    socket.liveSessionId = null;
  });

  socket.on('disconnect', async () => {
    if (socket.liveRoomId) {
      socket.to(`live:${socket.liveRoomId}`).emit('live:peer-left', { socketId: socket.id });

      if (socket.isAttendanceTracked && socket.liveSessionId) {
        await attendanceService.recordLeave(socket.userId, socket.liveSessionId).catch((err) => {
          logger.error(`Failed to record attendance leave on disconnect: ${err.message}`);
        });
      }
    }
  });
}

module.exports = { registerLiveClassHandlers };
