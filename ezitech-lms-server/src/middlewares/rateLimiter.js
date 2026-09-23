const rateLimit = require('express-rate-limit');
const { RedisStore } = require('rate-limit-redis');
const { redisClient } = require('../config/redis');
const env = require('../config/env');

function createRateLimiter({ windowMs, max, message, prefix, failOpen = true }) {
  if (!prefix) {
    throw new Error('createRateLimiter requires a unique `prefix` so multiple limiters do not share Redis key space');
  }

  if (env.nodeEnv === 'test') {
    return (req, res, next) => next();
  }

  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    passOnStoreError: failOpen,
    message,
    store: new RedisStore({
      sendCommand: (...args) => redisClient.call(...args),
      prefix: `rl:${prefix}:`,
    }),
  });
}

module.exports = { createRateLimiter };
