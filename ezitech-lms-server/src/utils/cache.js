const { redisClient } = require('../config/redis');
const logger = require('../utils/logger');

const DEFAULT_TTL_SECONDS = 60;

async function getOrSet(key, ttlSeconds, fetchFn) {
  try {
    const cached = await redisClient.get(key);
    if (cached) return JSON.parse(cached);
  } catch (err) {
    logger.warn(`Cache read failed for ${key}: ${err.message}`);
  }

  const fresh = await fetchFn();

  try {
    await redisClient.set(key, JSON.stringify(fresh), 'EX', ttlSeconds || DEFAULT_TTL_SECONDS);
  } catch (err) {
    logger.warn(`Cache write failed for ${key}: ${err.message}`);
  }

  return fresh;
}

async function invalidatePrefix(prefix) {
  try {
    let cursor = '0';
    const matched = [];
    do {
      const [nextCursor, keys] = await redisClient.scan(cursor, 'MATCH', `${prefix}*`, 'COUNT', 100);
      cursor = nextCursor;
      matched.push(...keys);
    } while (cursor !== '0');

    if (matched.length > 0) await redisClient.del(...matched);
  } catch (err) {
    logger.warn(`Cache invalidation failed for prefix ${prefix}: ${err.message}`);
  }
}

module.exports = { getOrSet, invalidatePrefix };
