const mongoose = require('mongoose');
const env = require('./env');
const logger = require('../utils/logger');

const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 3000;

async function connectDB(retries = MAX_RETRIES) {
  mongoose.set('strictQuery', true);

  try {
    await mongoose.connect(env.mongoUri, {
      serverSelectionTimeoutMS: 5000,
    });
    logger.info(`MongoDB connected: ${mongoose.connection.host}`);
  } catch (err) {
    logger.error(`MongoDB connection failed: ${err.message}`);

    if (retries > 0) {
      logger.warn(
        `Retrying MongoDB connection in ${RETRY_DELAY_MS}ms... (${retries} attempts left)`
      );
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
      return connectDB(retries - 1);
    }

    throw new Error('Could not connect to MongoDB after multiple attempts', { cause: err });
  }

  mongoose.connection.on('disconnected', () => {
    logger.warn('MongoDB disconnected');
  });

  mongoose.connection.on('error', (err) => {
    logger.error(`MongoDB connection error: ${err.message}`);
  });
}

async function disconnectDB() {
  await mongoose.connection.close();
  logger.info('MongoDB connection closed');
}

module.exports = { connectDB, disconnectDB };
