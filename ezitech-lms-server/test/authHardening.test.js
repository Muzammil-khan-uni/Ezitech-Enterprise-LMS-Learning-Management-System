const request = require('supertest');
const speakeasy = require('speakeasy');
const app = require('../src/app');
const { User } = require('../src/models/User.model');
const Session = require('../src/models/Session.model');
const { EMAIL_TEMPLATES } = require('../src/jobs/email.job');
const { toCsv } = require('../src/utils/exporters');
const { createUser, authHeader } = require('./helpers/factories');
const { lastEmailTo, extractTokenFromUrl } = require('./helpers/mailbox');

function refreshCookie(res) {
  const raw = (res.headers['set-cookie'] || []).find((c) => c.startsWith('refreshToken='));
  return raw ? raw.split(';')[0] : null;
}

async function login(email, password, extra = {}) {
  return request(app).post('/api/v1/auth/login').send({ email, password, ...extra });
}

async function enableMfa(email, password) {
  const first = await login(email, password);
  const accessToken = first.body.data.accessToken;
  const setup = await request(app).post('/api/v1/auth/mfa/setup').set('Authorization', `Bearer ${accessToken}`);
  const { secret } = setup.body.data;
  const verify = await request(app)
    .post('/api/v1/auth/mfa/verify')
    .set('Authorization', `Bearer ${accessToken}`)
    .send({ token: speakeasy.totp({ secret, encoding: 'base32' }) });
  return { accessToken, secret, recoveryCodes: verify.body.data.recoveryCodes };
}

describe('Registration is student-only', () => {
  test.each(['admin', 'instructor', 'mentor', 'course_manager'])('a request asking for the %s role still creates a student', async (role) => {
    const email = `role-${role}-${Date.now()}@example.com`;
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ name: 'Role Tester', email, password: 'Passw0rd!', role });

    expect(res.status).toBe(201);
    expect(res.body.data.role).toBe('student');
    const stored = await User.findOne({ email });
    expect(stored.role).toBe('student');
  });
});

describe('Account lockout', () => {
  test('five wrong passwords lock the account, even the correct password is refused, and an admin can unlock it', async () => {
    const { user, password } = await createUser({ role: 'student' });

    let last;
    for (let i = 0; i < 5; i += 1) {
      last = await login(user.email, 'WrongPassw0rd!');
    }
    expect(last.status).toBe(429);
    expect(last.body.locked).toBe(true);
    expect(last.headers['retry-after']).toBeDefined();
    expect(lastEmailTo(user.email, 'accountLocked')).toBeDefined();

    const correctWhileLocked = await login(user.email, password);
    expect(correctWhileLocked.status).toBe(429);

    const { user: admin } = await createUser({ role: 'admin' });
    const unlock = await request(app).post(`/api/v1/users/${user._id}/unlock`).set('Authorization', authHeader(admin));
    expect(unlock.status).toBe(200);

    const afterUnlock = await login(user.email, password);
    expect(afterUnlock.status).toBe(200);
  });

  test('a lock expires on its own', async () => {
    const { user, password } = await createUser({ role: 'student' });
    for (let i = 0; i < 5; i += 1) await login(user.email, 'WrongPassw0rd!');

    await User.updateOne({ _id: user._id }, { $set: { lockUntil: new Date(Date.now() - 1000) } });

    const res = await login(user.email, password);
    expect(res.status).toBe(200);
  });

  test('a successful login clears earlier failures, so isolated typos never accumulate into a lock', async () => {
    const { user, password } = await createUser({ role: 'student' });

    for (let round = 0; round < 3; round += 1) {
      for (let i = 0; i < 4; i += 1) await login(user.email, 'WrongPassw0rd!');
      const ok = await login(user.email, password);
      expect(ok.status).toBe(200);
    }
  });

  test('failed MFA codes count toward the lock as well', async () => {
    const { user, password } = await createUser({ role: 'student' });
    await enableMfa(user.email, password);

    let last;
    for (let i = 0; i < 5; i += 1) last = await login(user.email, password, { mfaToken: '000000' });
    expect(last.status).toBe(429);
  });

  test('only admins can unlock accounts', async () => {
    const { user } = await createUser({ role: 'student' });
    const { user: other } = await createUser({ role: 'instructor' });
    const res = await request(app).post(`/api/v1/users/${user._id}/unlock`).set('Authorization', authHeader(other));
    expect(res.status).toBe(403);
  });
});

describe('MFA hardening', () => {
  test('the secret is encrypted at rest', async () => {
    const { user, password } = await createUser({ role: 'student' });
    await enableMfa(user.email, password);
    const raw = await User.collection.findOne({ _id: user._id });
    expect(raw.mfaSecret.startsWith('enc:v1:')).toBe(true);
  });

  test('calling setup on an account that already has MFA is refused and does not switch MFA off', async () => {
    const { user, password } = await createUser({ role: 'student' });
    const { secret } = await enableMfa(user.email, password);

    const fresh = await login(user.email, password, { mfaToken: speakeasy.totp({ secret, encoding: 'base32' }) });
    const setup = await request(app)
      .post('/api/v1/auth/mfa/setup')
      .set('Authorization', `Bearer ${fresh.body.data.accessToken}`);
    expect(setup.status).toBe(409);

    const stillProtected = await login(user.email, password);
    expect(stillProtected.body.mfaRequired).toBe(true);
  });

  test('turning MFA off needs the password and a valid code', async () => {
    const { user, password } = await createUser({ role: 'student' });
    const { accessToken, secret } = await enableMfa(user.email, password);
    const auth = { Authorization: `Bearer ${accessToken}` };

    const noProof = await request(app).post('/api/v1/auth/mfa/disable').set(auth).send({});
    expect(noProof.status).toBe(400);

    const wrongPassword = await request(app)
      .post('/api/v1/auth/mfa/disable')
      .set(auth)
      .send({ password: 'Nope12345!', token: speakeasy.totp({ secret, encoding: 'base32' }) });
    expect(wrongPassword.status).toBe(400);

    const wrongCode = await request(app).post('/api/v1/auth/mfa/disable').set(auth).send({ password, token: '000000' });
    expect(wrongCode.status).toBe(400);

    const ok = await request(app)
      .post('/api/v1/auth/mfa/disable')
      .set(auth)
      .send({ password, token: speakeasy.totp({ secret, encoding: 'base32' }) });
    expect(ok.status).toBe(200);

    const plainLogin = await login(user.email, password);
    expect(plainLogin.status).toBe(200);
  });

  test('an authenticator code cannot be used twice', async () => {
    const { user, password } = await createUser({ role: 'student' });
    const { secret } = await enableMfa(user.email, password);
    const code = speakeasy.totp({ secret, encoding: 'base32' });

    const first = await login(user.email, password, { mfaToken: code });
    expect(first.status).toBe(200);

    const replay = await login(user.email, password, { mfaToken: code });
    expect(replay.status).toBe(401);
  });

  test('recovery codes are long and can only be redeemed once', async () => {
    const { user, password } = await createUser({ role: 'student' });
    const { recoveryCodes } = await enableMfa(user.email, password);
    expect(recoveryCodes[0]).toMatch(/^[0-9a-f]{20}$/);

    const first = await login(user.email, password, { recoveryCode: recoveryCodes[0] });
    const second = await login(user.email, password, { recoveryCode: recoveryCodes[0] });
    expect(first.status).toBe(200);
    expect(second.status).toBe(401);
  });

  test('a secret stored in the old plaintext format still works and is upgraded on first use', async () => {
    const { user, password } = await createUser({ role: 'student' });
    const { secret } = await enableMfa(user.email, password);
    await User.collection.updateOne({ _id: user._id }, { $set: { mfaSecret: secret } });

    const res = await login(user.email, password, { mfaToken: speakeasy.totp({ secret, encoding: 'base32' }) });
    expect(res.status).toBe(200);
    const raw = await User.collection.findOne({ _id: user._id });
    expect(raw.mfaSecret.startsWith('enc:v1:')).toBe(true);
  });
});

describe('Password reset, change and invite activation', () => {
  async function requestResetToken(email) {
    await request(app).post('/api/v1/auth/forgot-password').send({ email });
    return extractTokenFromUrl(lastEmailTo(email, 'passwordReset').data.data.resetUrl);
  }

  test('resetting a password signs the account out everywhere and clears any lock', async () => {
    const { user, password } = await createUser({ role: 'student' });
    const first = await login(user.email, password);
    const cookie = refreshCookie(first);

    for (let i = 0; i < 5; i += 1) await login(user.email, 'WrongPassw0rd!');
    const token = await requestResetToken(user.email);
    const reset = await request(app).post('/api/v1/auth/reset-password').send({ token, password: 'BrandNewPassw0rd!' });
    expect(reset.status).toBe(200);
    expect(lastEmailTo(user.email, 'passwordChanged')).toBeDefined();

    const oldSession = await request(app).post('/api/v1/auth/refresh').set('Cookie', cookie);
    expect(oldSession.status).toBe(401);

    const relogin = await login(user.email, 'BrandNewPassw0rd!');
    expect(relogin.status).toBe(200);
  });

  test('a reset link cannot reactivate an account an administrator deactivated', async () => {
    const { user } = await createUser({ role: 'student' });
    const token = await requestResetToken(user.email);
    await User.updateOne({ _id: user._id }, { $set: { isActive: false } });

    const res = await request(app).post('/api/v1/auth/reset-password').send({ token, password: 'BrandNewPassw0rd!' });
    expect(res.status).toBe(400);
    const stored = await User.findById(user._id);
    expect(stored.isActive).toBe(false);
  });

  test('an invite link activates the invited account but a reset link cannot be used as an invite', async () => {
    const { user: admin } = await createUser({ role: 'admin' });
    const email = `invitee-${Date.now()}@example.com`;
    const invite = await request(app)
      .post('/api/v1/users/invite')
      .set('Authorization', authHeader(admin))
      .send({ name: 'New Instructor', email, role: 'instructor' });
    expect(invite.status).toBe(201);

    const inviteToken = extractTokenFromUrl(lastEmailTo(email, 'inviteUser').data.data.setPasswordUrl);
    const set = await request(app).post('/api/v1/auth/set-password').send({ token: inviteToken, password: 'InvitedPassw0rd!' });
    expect(set.status).toBe(200);
    const inviteeLogin = await login(email, 'InvitedPassw0rd!');
    expect(inviteeLogin.status).toBe(200);
    expect(inviteeLogin.body.data.user.role).toBe('instructor');

    const { user: active } = await createUser({ role: 'student' });
    const resetToken = await requestResetToken(active.email);
    const misuse = await request(app).post('/api/v1/auth/set-password').send({ token: resetToken, password: 'Whatever123!' });
    expect(misuse.status).toBe(400);
  });

  test('deactivating a pending invite kills its link', async () => {
    const { user: admin } = await createUser({ role: 'admin' });
    const email = `pending-${Date.now()}@example.com`;
    const invite = await request(app)
      .post('/api/v1/users/invite')
      .set('Authorization', authHeader(admin))
      .send({ name: 'Pending Mentor', email, role: 'mentor' });
    const inviteToken = extractTokenFromUrl(lastEmailTo(email, 'inviteUser').data.data.setPasswordUrl);

    await request(app)
      .patch(`/api/v1/users/${invite.body.data._id}/status`)
      .set('Authorization', authHeader(admin))
      .send({ isActive: false });

    const res = await request(app).post('/api/v1/auth/set-password').send({ token: inviteToken, password: 'InvitedPassw0rd!' });
    expect(res.status).toBe(400);
  });

  test('changing your password needs the current one, signs out other devices and keeps this one signed in', async () => {
    const { user, password } = await createUser({ role: 'student' });
    const other = await login(user.email, password);
    const otherCookie = refreshCookie(other);
    const here = await login(user.email, password);
    const auth = { Authorization: `Bearer ${here.body.data.accessToken}` };

    const wrong = await request(app)
      .post('/api/v1/auth/change-password')
      .set(auth)
      .send({ currentPassword: 'WrongPassw0rd!', newPassword: 'BrandNewPassw0rd!' });
    expect(wrong.status).toBe(400);

    const same = await request(app)
      .post('/api/v1/auth/change-password')
      .set(auth)
      .send({ currentPassword: password, newPassword: password });
    expect(same.status).toBe(400);

    const ok = await request(app)
      .post('/api/v1/auth/change-password')
      .set(auth)
      .send({ currentPassword: password, newPassword: 'BrandNewPassw0rd!' });
    expect(ok.status).toBe(200);
    expect(ok.body.data.accessToken).toEqual(expect.any(String));
    expect(refreshCookie(ok)).toBeTruthy();
    expect(lastEmailTo(user.email, 'passwordChanged')).toBeDefined();

    const otherDevice = await request(app).post('/api/v1/auth/refresh').set('Cookie', otherCookie);
    expect(otherDevice.status).toBe(401);
    const thisDevice = await request(app).post('/api/v1/auth/refresh').set('Cookie', refreshCookie(ok));
    expect(thisDevice.status).toBe(200);

    expect((await login(user.email, password)).status).toBe(401);
    expect((await login(user.email, 'BrandNewPassw0rd!')).status).toBe(200);
  });
});

describe('Refresh tokens', () => {
  test('two refreshes racing with the same cookie do not log the user out', async () => {
    const { user, password } = await createUser({ role: 'student' });
    const first = await login(user.email, password);
    const cookie = refreshCookie(first);

    const winner = await request(app).post('/api/v1/auth/refresh').set('Cookie', cookie);
    expect(winner.status).toBe(200);

    const loser = await request(app).post('/api/v1/auth/refresh').set('Cookie', cookie);
    expect(loser.status).toBe(409);

    const retry = await request(app).post('/api/v1/auth/refresh').set('Cookie', refreshCookie(winner));
    expect(retry.status).toBe(200);
  });

  test('replaying an old refresh token after the grace period revokes the whole session', async () => {
    const { user, password } = await createUser({ role: 'student' });
    const first = await login(user.email, password);
    const oldCookie = refreshCookie(first);

    const rotated = await request(app).post('/api/v1/auth/refresh').set('Cookie', oldCookie);
    expect(rotated.status).toBe(200);
    await Session.updateMany({}, { $set: { previousRotatedAt: new Date(Date.now() - 60 * 1000) } });

    const replay = await request(app).post('/api/v1/auth/refresh').set('Cookie', oldCookie);
    expect(replay.status).toBe(401);

    const legitimate = await request(app).post('/api/v1/auth/refresh').set('Cookie', refreshCookie(rotated));
    expect(legitimate.status).toBe(401);
  });

  test('a cross-origin page cannot trigger a refresh or logout', async () => {
    const { user, password } = await createUser({ role: 'student' });
    const first = await login(user.email, password);
    const cookie = refreshCookie(first);

    const foreign = await request(app)
      .post('/api/v1/auth/refresh')
      .set('Cookie', cookie)
      .set('Origin', 'https://scorm.attacker.example');
    expect(foreign.status).toBe(403);

    const foreignLogout = await request(app)
      .post('/api/v1/auth/logout')
      .set('Cookie', cookie)
      .set('Origin', 'https://scorm.attacker.example');
    expect(foreignLogout.status).toBe(403);

    const own = await request(app).post('/api/v1/auth/refresh').set('Cookie', cookie).set('Origin', 'http://localhost:5173');
    expect(own.status).toBe(200);
  });
});

describe('Output escaping', () => {
  test('user-controlled text in emails is HTML-escaped and dangerous links are neutralised', () => {
    const welcome = EMAIL_TEMPLATES.welcome({ name: '<img src=x onerror=alert(1)>' });
    expect(welcome.html).not.toContain('<img');
    expect(welcome.html).toContain('&lt;img');

    const cert = EMAIL_TEMPLATES.certificateIssued({
      name: 'A',
      courseTitle: '"><script>alert(1)</script>',
      downloadUrl: 'javascript:alert(1)',
    });
    expect(cert.html).not.toContain('<script>');
    expect(cert.html).toContain('href="#"');

    const deadline = EMAIL_TEMPLATES.assignmentDeadline({
      name: 'A',
      assessmentTitle: 'Quiz\r\nBcc: attacker@example.com',
      courseTitle: 'C',
      dueDate: new Date(),
    });
    expect(deadline.subject).not.toMatch(/[\r\n]/);
  });

  test('CSV cells that would be treated as spreadsheet formulas are neutralised, numbers are untouched', () => {
    const csv = toCsv({
      columns: [
        { key: 'name', label: 'Name' },
        { key: 'delta', label: 'Delta' },
      ],
      rows: [
        { name: '=HYPERLINK("http://evil.example","click")', delta: -5 },
        { name: '+1+1', delta: 3 },
        { name: '@SUM(A1)', delta: 0 },
        { name: 'Plain Name', delta: 1 },
      ],
    });
    const lines = csv.split('\n');
    expect(lines[1].startsWith('"\'=HYPERLINK')).toBe(true);
    expect(lines[1].endsWith(',-5')).toBe(true);
    expect(lines[2].startsWith("'+1+1")).toBe(true);
    expect(lines[3].startsWith("'@SUM")).toBe(true);
    expect(lines[4]).toBe('Plain Name,1');
  });
});
