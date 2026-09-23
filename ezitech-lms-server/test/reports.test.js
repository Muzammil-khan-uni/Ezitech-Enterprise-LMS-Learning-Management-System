const request = require('supertest');
const app = require('../src/app');
const { createUser, createCategory, authHeader } = require('./helpers/factories');

function csvRows(text) {
  return text
    .trim()
    .split('\n')
    .slice(1)
    .filter(Boolean);
}

describe('Reports: access control', () => {
  test('a student cannot export any report', async () => {
    const { user: student } = await createUser({ role: 'student' });
    const res = await request(app).get('/api/v1/reports/courses').set('Authorization', authHeader(student));
    expect(res.status).toBe(403);
  });

  test('an unknown report type is rejected', async () => {
    const { user: admin } = await createUser({ role: 'admin' });
    const res = await request(app).get('/api/v1/reports/not-a-real-type').set('Authorization', authHeader(admin));
    expect(res.status).toBe(400);
  });
});

describe('Reports: generation and format', () => {
  test('the students report is generated as CSV by default, with a real header row', async () => {
    const { user: admin } = await createUser({ role: 'admin' });
    await createUser({ role: 'student', name: 'Report Test Student' });

    const res = await request(app).get('/api/v1/reports/students').set('Authorization', authHeader(admin));
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/csv/);
    expect(res.text.split('\n')[0]).toBe('Name,Email,Status,Joined');
  });

  test('the same report can be requested as Excel or PDF', async () => {
    const { user: admin } = await createUser({ role: 'admin' });

    const excelRes = await request(app)
      .get('/api/v1/reports/students')
      .query({ format: 'excel' })
      .set('Authorization', authHeader(admin));
    expect(excelRes.status).toBe(200);
    expect(excelRes.headers['content-type']).toMatch(/spreadsheet/);

    const pdfRes = await request(app)
      .get('/api/v1/reports/students')
      .query({ format: 'pdf' })
      .set('Authorization', authHeader(admin));
    expect(pdfRes.status).toBe(200);
    expect(pdfRes.headers['content-type']).toMatch(/pdf/);
  });
});

describe('Reports: filters', () => {
  test('the courses report\'s courseId filter narrows results to exactly that course', async () => {
    const { user: admin } = await createUser({ role: 'admin' });
    const { user: instructor } = await createUser({ role: 'instructor' });
    const category = await createCategory();

    const targetRes = await request(app)
      .post('/api/v1/courses')
      .set('Authorization', authHeader(instructor))
      .send({ title: `Target Course ${Date.now()}`, category: category._id.toString() });
    const targetId = targetRes.body.data._id;

    await request(app)
      .post('/api/v1/courses')
      .set('Authorization', authHeader(instructor))
      .send({ title: `Other Course ${Date.now()}`, category: category._id.toString() });

    const unfiltered = await request(app).get('/api/v1/reports/courses').set('Authorization', authHeader(admin));
    const filtered = await request(app)
      .get('/api/v1/reports/courses')
      .query({ courseId: targetId })
      .set('Authorization', authHeader(admin));

    expect(csvRows(unfiltered.text).length).toBeGreaterThanOrEqual(2);
    expect(csvRows(filtered.text)).toHaveLength(1);
    expect(filtered.text).toContain(targetRes.body.data.title);
  });

  test('the courses report\'s instructorId filter narrows results to that instructor\'s courses', async () => {
    const { user: admin } = await createUser({ role: 'admin' });
    const { user: instructorA } = await createUser({ role: 'instructor' });
    const { user: instructorB } = await createUser({ role: 'instructor' });
    const category = await createCategory();

    await request(app)
      .post('/api/v1/courses')
      .set('Authorization', authHeader(instructorA))
      .send({ title: `A's Course ${Date.now()}`, category: category._id.toString() });
    await request(app)
      .post('/api/v1/courses')
      .set('Authorization', authHeader(instructorB))
      .send({ title: `B's Course ${Date.now()}`, category: category._id.toString() });

    const res = await request(app)
      .get('/api/v1/reports/courses')
      .query({ instructorId: instructorA._id.toString() })
      .set('Authorization', authHeader(admin));

    expect(csvRows(res.text)).toHaveLength(1);
  });

  test('an invalid date filter is rejected rather than silently ignored', async () => {
    const { user: admin } = await createUser({ role: 'admin' });
    const res = await request(app)
      .get('/api/v1/reports/students')
      .query({ dateFrom: 'not-a-date' })
      .set('Authorization', authHeader(admin));
    expect(res.status).toBe(400);
  });

  test('a dateFrom in the future excludes everything that already exists', async () => {
    const { user: admin } = await createUser({ role: 'admin' });
    await createUser({ role: 'student' });

    const res = await request(app)
      .get('/api/v1/reports/students')
      .query({ dateFrom: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() })
      .set('Authorization', authHeader(admin));

    expect(res.status).toBe(200);
    expect(csvRows(res.text)).toHaveLength(0);
  });
});
