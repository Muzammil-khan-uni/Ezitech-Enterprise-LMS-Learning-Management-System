const Redis = require('ioredis');
const env = require('./env');
const logger = require('../utils/logger');

const redisClient = new Redis(env.redisUrl, {
  maxRetriesPerRequest: 3,
  lazyConnect: false,
});

redisClient.on('connect', () => {
  logger.info('Redis connected');
});

redisClient.on('error', (err) => {
  logger.error(`Redis error: ${err.message}`);
});

async function disconnectRedis() {
  await redisClient.quit();
  logger.info('Redis connection closed');
}

module.exports = { redisClient, disconnectRedis };
