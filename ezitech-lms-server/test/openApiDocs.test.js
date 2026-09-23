const request = require('supertest');
const yaml = require('js-yaml');
const app = require('../src/app');

describe('API documentation', () => {
  test('the raw OpenAPI spec is served and is valid YAML describing this API', async () => {
    const res = await request(app).get('/api/v1/openapi.yaml');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/yaml/);

    const spec = yaml.load(res.text);
    expect(spec.openapi).toBe('3.0.3');
    expect(spec.info.title).toBe('Ezitech LMS API');
    expect(spec.paths).toHaveProperty('/auth/forgot-password');
    expect(spec.paths).toHaveProperty('/auth/mfa/recovery-codes');
    expect(spec.paths).toHaveProperty('/courses/{courseId}/lessons/{lessonId}');
    expect(spec.paths).toHaveProperty('/reports/{type}');
  });

  test('the docs page renders and points at the spec', async () => {
    const res = await request(app).get('/api/v1/docs');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/html/);
    expect(res.text).toContain('openapi.yaml');
  });
});
