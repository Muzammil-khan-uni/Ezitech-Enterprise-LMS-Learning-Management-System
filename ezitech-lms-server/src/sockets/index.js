const { Server } = require('socket.io');
const { createAdapter } = require('@socket.io/redis-adapter');
const Redis = require('ioredis');
const { verifyAccessToken } = require('../utils/tokenUtils');
const { User } = require('../models/User.model');
const env = require('../config/env');
const logger = require('../utils/logger');
const { registerLiveClassHandlers } = require('./liveClass.handler');

const ACCOUNT_RECHECK_INTERVAL_MS = 5 * 60 * 1000;

let io = null;

async function initSockets(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: env.clientOrigin,
      credentials: true,
    },
  });

  try {
    const pubClient = new Redis(env.redisUrl);
    const subClient = pubClient.duplicate();
    pubClient.on('error', (err) => logger.error(`Socket.IO adapter pub client error: ${err.message}`));
    subClient.on('error', (err) => logger.error(`Socket.IO adapter sub client error: ${err.message}`));
    io.adapter(createAdapter(pubClient, subClient));
  } catch (err) {
    logger.warn(`Socket.IO Redis adapter unavailable, falling back to in-memory (single-instance only): ${err.message}`);
  }

  io.use(async (socket, next) => {
    let payload;
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error('Authentication token missing'));
      payload = verifyAccessToken(token);
    } catch (err) {
      return next(new Error('Invalid or expired token', { cause: err }));
    }

    try {
      const user = await User.findById(payload.sub).select('isActive role');
      if (!user || !user.isActive) return next(new Error('Account is not active'));
      socket.userId = user._id.toString();
      socket.userRole = user.role;
      return next();
    } catch (err) {
      return next(new Error('Could not verify the account', { cause: err }));
    }
  });

  io.on('connection', (socket) => {
    socket.join(`user:${socket.userId}`);
    logger.info(`Socket connected: user ${socket.userId}`);

    registerLiveClassHandlers(io, socket);

    const recheck = setInterval(async () => {
      try {
        const user = await User.findById(socket.userId).select('isActive role');
        if (!user || !user.isActive) {
          socket.disconnect(true);
          return;
        }
        socket.userRole = user.role;
      } catch (err) {
        logger.warn(`Socket account re-check failed for user ${socket.userId}: ${err.message}`);
      }
    }, ACCOUNT_RECHECK_INTERVAL_MS);
    recheck.unref();

    socket.on('disconnect', () => {
      clearInterval(recheck);
      logger.info(`Socket disconnected: user ${socket.userId}`);
    });
  });

  return io;
}

function getIO() {
  if (!io) {
    return null;
  }
  return io;
}

function emitToUser(userId, event, payload) {
  const instance = getIO();
  if (!instance) return;
  instance.to(`user:${userId}`).emit(event, payload);
}

function emitToUsers(userIds, event, payload) {
  const instance = getIO();
  if (!instance || userIds.length === 0) return;
  const rooms = userIds.map((id) => `user:${id}`);
  instance.to(rooms).emit(event, payload);
}

module.exports = { initSockets, getIO, emitToUser, emitToUsers };
