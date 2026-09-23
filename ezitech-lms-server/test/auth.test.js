const request = require('supertest');
const speakeasy = require('speakeasy');
const app = require('../src/app');
const { createUser } = require('./helpers/factories');
const { lastEmailTo, extractTokenFromUrl } = require('./helpers/mailbox');

describe('Auth: registration and login', () => {
  test('a new user can register, then log in with the same credentials', async () => {
    const email = `newstudent-${Date.now()}@example.com`;

    const registerRes = await request(app)
      .post('/api/v1/auth/register')
      .send({ name: 'New Student', email, password: 'Passw0rd!', role: 'student' });

    expect(registerRes.status).toBe(201);
    expect(registerRes.body.data.email).toBe(email);
    expect(registerRes.body.data.password).toBeUndefined();

    const loginRes = await request(app).post('/api/v1/auth/login').send({ email, password: 'Passw0rd!' });

    expect(loginRes.status).toBe(200);
    expect(loginRes.body.data.accessToken).toEqual(expect.any(String));
    expect(loginRes.body.data.user.email).toBe(email);
  });

  test('registration sends a verification email containing a usable token', async () => {
    const email = `verifyme-${Date.now()}@example.com`;
    await request(app).post('/api/v1/auth/register').send({ name: 'Verify Me', email, password: 'Passw0rd!' });

    const job = lastEmailTo(email, 'verifyEmail');
    expect(job).toBeDefined();
    const token = extractTokenFromUrl(job.data.data.verifyUrl);
    expect(token).toEqual(expect.any(String));

    const verifyRes = await request(app).post('/api/v1/auth/verify-email').send({ token });
    expect(verifyRes.status).toBe(200);

    const replay = await request(app).post('/api/v1/auth/verify-email').send({ token });
    expect(replay.status).toBe(400);
  });

  test('login rejects a wrong password, and does not distinguish "no such user" from "wrong password"', async () => {
    const { user } = await createUser({ role: 'student', email: 'realuser@example.com' });

    const wrongPassword = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: user.email, password: 'not-the-password' });
    const noSuchUser = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'nobody-here@example.com', password: 'whatever123' });

    expect(wrongPassword.status).toBe(401);
    expect(noSuchUser.status).toBe(401);
    expect(wrongPassword.body.message).toBe(noSuchUser.body.message);
  });

  test('a deactivated account cannot log in even with the correct password', async () => {
    const { user, password } = await createUser({ role: 'student', isActive: false });

    const res = await request(app).post('/api/v1/auth/login').send({ email: user.email, password });
    expect(res.status).toBe(403);
  });
});

describe('Auth: forgot / reset password', () => {
  test('requesting a reset for a real account queues an email with a working token', async () => {
    const { user } = await createUser({ role: 'student' });

    const forgotRes = await request(app).post('/api/v1/auth/forgot-password').send({ email: user.email });
    expect(forgotRes.status).toBe(200);

    const job = lastEmailTo(user.email, 'passwordReset');
    const token = extractTokenFromUrl(job.data.data.resetUrl);

    const resetRes = await request(app)
      .post('/api/v1/auth/reset-password')
      .send({ token, password: 'BrandNewPassw0rd!' });
    expect(resetRes.status).toBe(200);

    const oldLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: user.email, password: 'Passw0rd!' });
    expect(oldLogin.status).toBe(401);

    const newLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: user.email, password: 'BrandNewPassw0rd!' });
    expect(newLogin.status).toBe(200);
  });

  test('requesting a reset for an email that is not registered still returns 200 (no account enumeration)', async () => {
    const res = await request(app)
      .post('/api/v1/auth/forgot-password')
      .send({ email: 'definitely-not-registered@example.com' });
    expect(res.status).toBe(200);
    expect(lastEmailTo('definitely-not-registered@example.com')).toBeUndefined();
  });

  test('a reset token cannot be reused after it has been consumed', async () => {
    const { user } = await createUser({ role: 'student' });
    await request(app).post('/api/v1/auth/forgot-password').send({ email: user.email });
    const job = lastEmailTo(user.email, 'passwordReset');
    const token = extractTokenFromUrl(job.data.data.resetUrl);

    await request(app).post('/api/v1/auth/reset-password').send({ token, password: 'FirstReset1!' });
    const secondAttempt = await request(app)
      .post('/api/v1/auth/reset-password')
      .send({ token, password: 'SecondReset1!' });

    expect(secondAttempt.status).toBe(400);
  });
});

describe('Auth: MFA', () => {
  async function loginAndGetToken(email, password) {
    const res = await request(app).post('/api/v1/auth/login').send({ email, password });
    return res.body.data.accessToken;
  }

  test('enabling MFA requires a valid TOTP code and returns one-time recovery codes', async () => {
    const { user, password } = await createUser({ role: 'student' });
    const accessToken = await loginAndGetToken(user.email, password);

    const setupRes = await request(app)
      .post('/api/v1/auth/mfa/setup')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(setupRes.status).toBe(200);
    const { secret } = setupRes.body.data;

    const badCode = await request(app)
      .post('/api/v1/auth/mfa/verify')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ token: '000000' });
    expect(badCode.status).toBe(400);

    const validToken = speakeasy.totp({ secret, encoding: 'base32' });
    const verifyRes = await request(app)
      .post('/api/v1/auth/mfa/verify')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ token: validToken });

    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body.data.recoveryCodes).toHaveLength(10);
  });

  test('once MFA is enabled, login requires a second factor - and a recovery code works as an alternative to the authenticator', async () => {
    const { user, password } = await createUser({ role: 'student' });
    let accessToken = await loginAndGetToken(user.email, password);

    const setupRes = await request(app)
      .post('/api/v1/auth/mfa/setup')
      .set('Authorization', `Bearer ${accessToken}`);
    const { secret } = setupRes.body.data;
    const verifyRes = await request(app)
      .post('/api/v1/auth/mfa/verify')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ token: speakeasy.totp({ secret, encoding: 'base32' }) });
    const [recoveryCode] = verifyRes.body.data.recoveryCodes;

    const passwordOnly = await request(app).post('/api/v1/auth/login').send({ email: user.email, password });
    expect(passwordOnly.status).toBe(401);
    expect(passwordOnly.body.mfaRequired).toBe(true);

    const wrongCode = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: user.email, password, recoveryCode: 'not-a-real-code' });
    expect(wrongCode.status).toBe(401);

    const recoveryLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: user.email, password, recoveryCode });
    expect(recoveryLogin.status).toBe(200);
    accessToken = recoveryLogin.body.data.accessToken;

    const reuseAttempt = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: user.email, password, recoveryCode });
    expect(reuseAttempt.status).toBe(401);

    const totpLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: user.email, password, mfaToken: speakeasy.totp({ secret, encoding: 'base32' }) });
    expect(totpLogin.status).toBe(200);
  });
});
