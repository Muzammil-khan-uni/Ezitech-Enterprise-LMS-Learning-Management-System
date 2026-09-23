const { MongoMemoryServer } = require('mongodb-memory-server');

module.exports = async function globalSetup() {
  process.env.NODE_ENV = 'test';

  process.env.JWT_ACCESS_SECRET = 'test-access-secret-not-for-real-use-00000';
  process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-not-for-real-use-0000';
  process.env.JWT_ACCESS_EXPIRES_IN = '15m';
  process.env.JWT_REFRESH_EXPIRES_IN = '7d';

  process.env.CLIENT_ORIGIN = 'http://localhost:5173';
  process.env.SERVER_PUBLIC_URL = 'http://localhost:5000';
  process.env.LOG_LEVEL = 'error';
  process.env.INSTRUCTOR_COMMISSION_PERCENT = '70';

  process.env.REDIS_URL = 'redis://127.0.0.1:6379/0';

  const mongod = await MongoMemoryServer.create();
  global.__MONGOD__ = mongod;
  process.env.MONGO_URI = mongod.getUri('ezitech_lms_test');
};
