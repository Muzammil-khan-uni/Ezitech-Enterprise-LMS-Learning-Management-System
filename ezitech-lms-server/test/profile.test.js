const request = require('supertest');
const app = require('../src/app');
const { createUser, authHeader } = require('./helpers/factories');
const { lastEmailTo } = require('./helpers/mailbox');

describe('Profile: /users/me', () => {
  test('a user can edit, then remove, phone, bio, skills, education and links', async () => {
    const { user } = await createUser();
    const auth = authHeader(user);

    const res = await request(app)
      .patch('/api/v1/users/me')
      .set('Authorization', auth)
      .send({
        name: 'Ada Lovelace',
        phone: '+92 300 1234567',
        bio: 'Mathematician',
        skills: ['JavaScript', 'javascript', ' React '],
        education: [{ school: 'University of London', degree: 'BSc', startYear: 2015, endYear: 2019 }],
        socialLinks: { github: 'https://github.com/ada', linkedin: 'https://www.linkedin.com/in/ada' },
      });

    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe('Ada Lovelace');
    expect(res.body.data.phone).toBe('+92 300 1234567');
    expect(res.body.data.skills).toEqual(['JavaScript', 'React']);
    expect(res.body.data.education).toHaveLength(1);
    expect(res.body.data.education[0]._id).toEqual(expect.any(String));
    expect(res.body.data.socialLinks.github).toBe('https://github.com/ada');

    const cleared = await request(app)
      .patch('/api/v1/users/me')
      .set('Authorization', auth)
      .send({ phone: null, bio: '', skills: [], education: [], socialLinks: { github: null } });

    expect(cleared.status).toBe(200);
    expect(cleared.body.data.phone).toBeUndefined();
    expect(cleared.body.data.bio).toBe('');
    expect(cleared.body.data.skills).toEqual([]);
    expect(cleared.body.data.education).toEqual([]);
    expect(cleared.body.data.socialLinks.github).toBeUndefined();
    expect(cleared.body.data.socialLinks.linkedin).toBe('https://www.linkedin.com/in/ada');
  });

  test('rejects invalid phone numbers, foreign social links and reversed education years', async () => {
    const { user } = await createUser();
    const auth = authHeader(user);

    const badPhone = await request(app).patch('/api/v1/users/me').set('Authorization', auth).send({ phone: 'call me' });
    expect(badPhone.status).toBe(400);

    const badLink = await request(app)
      .patch('/api/v1/users/me')
      .set('Authorization', auth)
      .send({ socialLinks: { github: 'https://evil.example.com/ada' } });
    expect(badLink.status).toBe(400);

    const badYears = await request(app)
      .patch('/api/v1/users/me')
      .set('Authorization', auth)
      .send({ education: [{ school: 'MIT', startYear: 2020, endYear: 2018 }] });
    expect(badYears.status).toBe(400);
  });

  test('does not allow changing role or permissions through the profile endpoint', async () => {
    const { user } = await createUser();
    const res = await request(app)
      .patch('/api/v1/users/me')
      .set('Authorization', authHeader(user))
      .send({ name: 'Still Student', role: 'admin', permissions: ['everything'] });

    expect(res.status).toBe(200);
    expect(res.body.data.role).toBe('student');
    expect(res.body.data.permissions).toEqual([]);
  });

  test('removing a photo that was never set succeeds', async () => {
    const { user } = await createUser();
    const res = await request(app).delete('/api/v1/users/me/avatar').set('Authorization', authHeader(user));
    expect(res.status).toBe(200);
  });

  test('avatar upload rejects non-image files', async () => {
    const { user } = await createUser();
    const res = await request(app)
      .post('/api/v1/users/me/avatar')
      .set('Authorization', authHeader(user))
      .attach('file', Buffer.from('not an image'), { filename: 'evil.svg', contentType: 'image/svg+xml' });
    expect(res.status).toBe(400);
  });

  test('changing email requires the password, resets verification and sends a new link', async () => {
    const { user, password } = await createUser();
    const auth = authHeader(user);
    const newEmail = `changed-${Date.now()}@example.com`;

    const wrong = await request(app).post('/api/v1/users/me/email').set('Authorization', auth).send({ email: newEmail, password: 'Wrong123!' });
    expect(wrong.status).toBe(400);

    const ok = await request(app).post('/api/v1/users/me/email').set('Authorization', auth).send({ email: newEmail, password });
    expect(ok.status).toBe(200);
    expect(ok.body.data.email).toBe(newEmail);
    expect(ok.body.data.isEmailVerified).toBe(false);
    expect(lastEmailTo(newEmail, 'verifyEmail')).toBeDefined();

    const login = await request(app).post('/api/v1/auth/login').send({ email: newEmail, password });
    expect(login.status).toBe(200);
  });

  test('changing email to one already in use is rejected', async () => {
    const { user, password } = await createUser();
    const { user: other } = await createUser();
    const res = await request(app)
      .post('/api/v1/users/me/email')
      .set('Authorization', authHeader(user))
      .send({ email: other.email, password });
    expect(res.status).toBe(409);
  });
});
