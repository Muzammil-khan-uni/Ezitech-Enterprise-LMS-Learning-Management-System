const http = require('http');
const fs = require('fs/promises');
const path = require('path');
const env = require('./config/env');
const logger = require('./utils/logger');
const app = require('./app');
const { connectDB, disconnectDB } = require('./config/db');
const { disconnectRedis } = require('./config/redis');
const { initSockets } = require('./sockets');
const { startEmailWorker } = require('./jobs/email.job');
const { startReminderWorker, scheduleDeadlineReminders } = require('./jobs/deadline-reminder.job');

let server;
let emailWorker;
let reminderWorker;

async function cleanupTempUploads() {
  const tmpDir = path.join(__dirname, '..', 'uploads-tmp');
  try {
    const files = await fs.readdir(tmpDir);
    await Promise.all(files.map((f) => fs.unlink(path.join(tmpDir, f)).catch(() => {})));
    if (files.length > 0) {
      logger.info(`Cleaned up ${files.length} leftover temp upload file(s) from a previous run`);
    }
  } catch {
    return;
  }
}

async function start() {
  try {
    await connectDB();
    await cleanupTempUploads();

    server = http.createServer(app);
    await initSockets(server);

    emailWorker = startEmailWorker();
    reminderWorker = startReminderWorker();
    await scheduleDeadlineReminders();

    server.listen(env.port, () => {
      logger.info(`Ezitech LMS API running in ${env.nodeEnv} mode on port ${env.port}`);
    });
  } catch (err) {
    logger.error(`Failed to start server: ${err.message}`);
    process.exit(1);
  }
}

async function shutdown(signal) {
  logger.warn(`${signal} received: starting graceful shutdown`);

  if (server) {
    server.close(async () => {
      logger.info('HTTP server closed');
      try {
        await emailWorker?.close();
        await reminderWorker?.close();
        await disconnectDB();
        await disconnectRedis();
      } catch (err) {
        logger.error(`Error during shutdown cleanup: ${err.message}`);
      } finally {
        process.exit(0);
      }
    });

    setTimeout(() => {
      logger.error('Forcing shutdown after timeout');
      process.exit(1);
    }, 10_000).unref();
  } else {
    process.exit(0);
  }
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

process.on('unhandledRejection', (reason) => {
  logger.error(`Unhandled Rejection: ${reason instanceof Error ? reason.stack : reason}`);
  shutdown('unhandledRejection');
});

process.on('uncaughtException', (err) => {
  logger.error(`Uncaught Exception: ${err.stack}`);
  shutdown('uncaughtException');
});

start();
