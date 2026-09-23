const request = require('supertest');
const app = require('../src/app');
const scormService = require('../src/modules/scorm/scorm.service');
const env = require('../src/config/env');
const { createUser, createCategory, authHeader } = require('./helpers/factories');

const ASSET = 'https://res.cloudinary.com/demo/raw/upload/v1/package.zip';

async function createScormCourse(instructor, { entryPoint = 'index.html' } = {}) {
  const category = await createCategory();
  const courseRes = await request(app)
    .post('/api/v1/courses')
    .set('Authorization', authHeader(instructor))
    .send({ title: `SCORM Course ${Date.now()}`, category: category._id.toString(), price: 0 });
  const courseId = courseRes.body.data._id;

  const sectionRes = await request(app)
    .post(`/api/v1/courses/${courseId}/sections`)
    .set('Authorization', authHeader(instructor))
    .send({ title: 'Module', order: 0 });

  const token = scormService.signPackageToken({ url: ASSET, folder: '' });
  const lessonRes = await request(app)
    .post(`/api/v1/courses/${courseId}/lessons`)
    .set('Authorization', authHeader(instructor))
    .send({
      title: 'Interactive module',
      section: sectionRes.body.data._id,
      order: 0,
      lessonType: 'scorm',
      packageUrl: `${env.scormContentOrigin}/api/v1/scorm/packages/${token}`,
      entryPoint,
    });

  await request(app)
    .patch(`/api/v1/courses/${courseId}/status`)
    .set('Authorization', authHeader(instructor))
    .send({ status: 'published' });

  return { courseId, lessonId: lessonRes.body.data._id };
}

describe('SCORM isolation from the application origin', () => {
  test('content is only served on the dedicated content host, never on the app host', async () => {
    const token = scormService.signLaunchToken({ url: ASSET, folder: '', entry: 'index.html' });

    const appHost = await request(app)
      .get(`/api/v1/scorm/player/${token}`)
      .set('Host', 'lms.example.com');
    expect(appHost.status).toBe(404);

    const appHostPackage = await request(app)
      .get(`/api/v1/scorm/packages/${token}/index.html`)
      .set('Host', 'lms.example.com');
    expect(appHostPackage.status).toBe(404);
  });

  test('the player page is framable only by the app, defines the SCORM API locally, and cannot be injected through the entry point', async () => {
    const token = scormService.signLaunchToken({
      url: ASSET,
      folder: '',
      entry: 'index.html?a="</script><script>alert(1)</script>',
    });

    const res = await request(app).get(`/api/v1/scorm/player/${token}`);

    expect(res.status).toBe(200);
    expect(res.headers['x-frame-options']).toBeUndefined();
    expect(res.headers['content-security-policy']).toContain('frame-ancestors http://localhost:5173');
    expect(res.headers['content-security-policy']).toContain("object-src 'none'");
    expect(res.text).toContain('window.API');
    expect(res.text).not.toContain('</script><script>alert(1)');
  });
});

describe('SCORM launch endpoint', () => {
  test('an enrolled student gets a short-lived player URL; the permanent package URL is never sent to learners', async () => {
    const { user: instructor } = await createUser({ role: 'instructor' });
    const { user: student } = await createUser({ role: 'student' });
    const { courseId, lessonId } = await createScormCourse(instructor);

    await request(app).post('/api/v1/enrollments').set('Authorization', authHeader(student)).send({ courseId });

    const launch = await request(app)
      .get(`/api/v1/scorm/courses/${courseId}/lessons/${lessonId}/launch`)
      .set('Authorization', authHeader(student));

    expect(launch.status).toBe(200);
    expect(launch.body.data.contentOrigin).toBe(env.scormContentOrigin);
    expect(launch.body.data.playerUrl.startsWith(`${env.scormContentOrigin}/api/v1/scorm/player/`)).toBe(true);
    expect(launch.body.data.progress.lessonStatus).toBe('not attempted');

    const listed = await request(app)
      .get(`/api/v1/courses/${courseId}/lessons`)
      .set('Authorization', authHeader(student));
    expect(listed.status).toBe(200);
    expect(listed.body.data[0].packageUrl).toBeUndefined();
    expect(listed.body.data[0].entryPoint).toBeUndefined();

    const single = await request(app)
      .get(`/api/v1/courses/${courseId}/lessons/${lessonId}`)
      .set('Authorization', authHeader(student));
    expect(single.body.data.packageUrl).toBeUndefined();

    const ownerView = await request(app)
      .get(`/api/v1/courses/${courseId}/lessons`)
      .set('Authorization', authHeader(instructor));
    expect(ownerView.body.data[0].packageUrl).toContain('/scorm/packages/');
  });

  test('a student who is not enrolled cannot launch the lesson', async () => {
    const { user: instructor } = await createUser({ role: 'instructor' });
    const { user: outsider } = await createUser({ role: 'student' });
    const { courseId, lessonId } = await createScormCourse(instructor);

    const launch = await request(app)
      .get(`/api/v1/scorm/courses/${courseId}/lessons/${lessonId}/launch`)
      .set('Authorization', authHeader(outsider));
    expect(launch.status).toBe(403);
  });

  test('an entry point that tries to escape the package or use a scheme is refused', async () => {
    const { user: instructor } = await createUser({ role: 'instructor' });

    for (const entryPoint of ['../secrets.html', 'javascript:alert(1)', '/etc/passwd']) {
      const { courseId, lessonId } = await createScormCourse(instructor, { entryPoint });
      const launch = await request(app)
        .get(`/api/v1/scorm/courses/${courseId}/lessons/${lessonId}/launch`)
        .set('Authorization', authHeader(instructor));
      expect(launch.status).toBe(400);
    }
  });
});
