const crypto = require('crypto');
const request = require('supertest');
const app = require('../src/app');
const scormService = require('../src/modules/scorm/scorm.service');

function signLegacyToken(payload, secret = process.env.JWT_ACCESS_SECRET) {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createHmac('sha256', secret).update(body).digest('base64url');
  return `${body}.${signature}`;
}

const signTestToken = (payload, secret) =>
  secret ? signLegacyToken(payload, secret) : scormService.signLaunchToken({ ...payload, entry: 'index.html' });

describe('SCORM package token security (Phase A HMAC-signing fix)', () => {
  test('a plain unsigned base64 token - the OLD vulnerable format - is rejected', async () => {
    const oldFormatToken = Buffer.from(
      JSON.stringify({ url: 'https://res.cloudinary.com/demo/raw/upload/v1/package.zip', folder: '' })
    ).toString('base64url');

    const res = await request(app).get(`/api/v1/scorm/packages/${oldFormatToken}/index.html`);
    expect(res.status).toBe(400);
  });

  test('a token with a tampered payload (signature no longer matches) is rejected', async () => {
    const validToken = signTestToken({ url: 'https://res.cloudinary.com/demo/raw/upload/v1/package.zip', folder: '' });
    const [body, signature] = validToken.split('.');

    const tamperedBody = Buffer.from(
      JSON.stringify({ url: 'https://res.cloudinary.com/demo/raw/upload/v1/OTHER.zip', folder: '' })
    ).toString('base64url');
    const tamperedToken = `${tamperedBody}.${signature}`;

    const res = await request(app).get(`/api/v1/scorm/packages/${tamperedToken}/index.html`);
    expect(res.status).toBe(400);
    expect(body).not.toBe(tamperedBody);
  });

  test('a token signed with the WRONG secret is rejected', async () => {
    const forgedToken = signTestToken(
      { url: 'https://res.cloudinary.com/demo/raw/upload/v1/package.zip', folder: '' },
      'a-completely-different-secret-an-attacker-might-guess'
    );

    const res = await request(app).get(`/api/v1/scorm/packages/${forgedToken}/index.html`);
    expect(res.status).toBe(400);
  });

  test('a correctly-signed token pointing at a disallowed host is still rejected (defense in depth)', async () => {
    const internalTargetToken = signTestToken({ url: 'https://169.254.169.254/latest/meta-data/', folder: '' });

    const res = await request(app).get(`/api/v1/scorm/packages/${internalTargetToken}/index.html`);
    expect(res.status).toBe(400);
  });

  test('a correctly-signed token using http:// instead of https:// is rejected', async () => {
    const httpToken = signTestToken({ url: 'http://res.cloudinary.com/demo/raw/upload/v1/package.zip', folder: '' });

    const res = await request(app).get(`/api/v1/scorm/packages/${httpToken}/index.html`);
    expect(res.status).toBe(400);
  });

  test('a malformed token (not even two dot-separated segments) is rejected, not a 500', async () => {
    const res = await request(app).get('/api/v1/scorm/packages/not-a-real-token-at-all/index.html');
    expect(res.status).toBe(400);
  });

  test('a launch token that has expired is rejected with 410', async () => {
    const expired = scormService.signLaunchToken({
      url: 'https://res.cloudinary.com/demo/raw/upload/v1/package.zip',
      folder: '',
      entry: 'index.html',
      ttlMs: -1000,
    });
    const res = await request(app).get(`/api/v1/scorm/packages/${expired}/index.html`);
    expect(res.status).toBe(410);
  });

  test('the permanent package token (used only by the server) is not accepted by the public route', async () => {
    const permanent = scormService.signPackageToken({
      url: 'https://res.cloudinary.com/demo/raw/upload/v1/package.zip',
      folder: '',
    });
    const res = await request(app).get(`/api/v1/scorm/packages/${permanent}/index.html`);
    expect(res.status).toBe(400);
  });

  test('a token signed the OLD way (raw JWT secret) is no longer accepted by the public route', async () => {
    const legacy = signLegacyToken({ url: 'https://res.cloudinary.com/demo/raw/upload/v1/package.zip', folder: '' });
    const res = await request(app).get(`/api/v1/scorm/packages/${legacy}/index.html`);
    expect(res.status).toBe(400);
  });

  test('the package route is reachable without authentication (the content origin has no session)', async () => {
    const res = await request(app).get('/api/v1/scorm/packages/garbage/index.html');
    expect(res.status).not.toBe(401);
  });
});
