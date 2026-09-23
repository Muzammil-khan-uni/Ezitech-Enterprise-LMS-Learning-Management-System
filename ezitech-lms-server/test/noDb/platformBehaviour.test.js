const request = require('supertest');

const baseEnv = {
  NODE_ENV: 'test',
  MONGO_URI: 'mongodb://127.0.0.1:1/unused',
  REDIS_URL: 'redis://127.0.0.1:6379',
  JWT_ACCESS_SECRET: 'a'.repeat(40),
  JWT_REFRESH_SECRET: 'b'.repeat(40),
  MFA_ENCRYPTION_KEY: 'm'.repeat(40),
};

function loadEnv(overrides) {
  let env;
  const saved = { ...process.env };
  try {
    Object.assign(process.env, baseEnv, overrides);
    for (const [key, value] of Object.entries(overrides)) {
      if (value === undefined) delete process.env[key];
    }
    jest.isolateModules(() => {
      env = require('../../src/config/env');
    });
  } finally {
    process.env = saved;
  }
  return env;
}

describe('TRUST_PROXY configuration', () => {
  test.each([
    [{ NODE_ENV: 'production' }, 1],
    [{ NODE_ENV: 'development' }, false],
    [{ NODE_ENV: 'production', TRUST_PROXY: 'false' }, false],
    [{ NODE_ENV: 'production', TRUST_PROXY: 'true' }, true],
    [{ NODE_ENV: 'production', TRUST_PROXY: '2' }, 2],
    [{ NODE_ENV: 'production', TRUST_PROXY: 'loopback, 10.0.0.0/8' }, 'loopback, 10.0.0.0/8'],
  ])('%j resolves to %j', (overrides, expected) => {
    delete process.env.TRUST_PROXY;
    expect(loadEnv({ TRUST_PROXY: undefined, ...overrides }).trustProxy).toBe(expected);
  });
});

describe('Payments switch', () => {
  test('payments are on when the variable is absent, empty or true, with no gateway needed', () => {
    expect(loadEnv({ PAYMENTS_ENABLED: undefined }).paymentsEnabled).toBe(true);
    expect(loadEnv({ PAYMENTS_ENABLED: '' }).paymentsEnabled).toBe(true);
    expect(loadEnv({ PAYMENTS_ENABLED: 'true' }).paymentsEnabled).toBe(true);
  });

  test('only an explicit PAYMENTS_ENABLED=false switches them off', () => {
    expect(loadEnv({ PAYMENTS_ENABLED: 'false' }).paymentsEnabled).toBe(false);
    expect(loadEnv({ PAYMENTS_ENABLED: ' False ' }).paymentsEnabled).toBe(false);
  });
});

describe('HTTP edge behaviour without a database', () => {
  let app;

  beforeAll(() => {
    Object.assign(process.env, baseEnv);
    app = require('../../src/app');
  });

  test('liveness endpoint answers without any dependency', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
  });

  test('readiness endpoint reports 503 while MongoDB is not connected', async () => {
    const res = await request(app).get('/health/ready');
    expect(res.status).toBe(503);
    expect(res.body.data.mongo).toBe(false);
  });

  test('malformed JSON is a 400, not a 500', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .set('Content-Type', 'application/json')
      .send('{not json');
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/malformed json/i);
  });

  test('an oversized body is a 413, not a 500', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .set('Content-Type', 'application/json')
      .send(JSON.stringify({ email: 'a'.repeat(11 * 1024 * 1024) }));
    expect(res.status).toBe(413);
  });
});
