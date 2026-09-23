const mongoose = require('mongoose');
const { User } = require('../../src/models/User.model');
const CourseCategory = require('../../src/models/CourseCategory.model');
const CertificateTemplate = require('../../src/models/CertificateTemplate.model');
const { signAccessToken } = require('../../src/utils/tokenUtils');

let counter = 0;
function unique() {
  counter += 1;
  return `${Date.now()}-${counter}`;
}

async function createUser({ role = 'student', password = 'Passw0rd!', ...overrides } = {}) {
  const id = unique();
  const user = await User.create({
    name: overrides.name || `Test ${role} ${id}`,
    email: overrides.email || `${role}.${id}@example.com`,
    password,
    role,
    isActive: true,
    isEmailVerified: true,
    ...overrides,
  });
  return { user, password };
}

function tokenFor(user) {
  return signAccessToken(user);
}

function authHeader(user) {
  return `Bearer ${tokenFor(user)}`;
}

async function createCategory(overrides = {}) {
  return CourseCategory.create({
    name: overrides.name || `Category ${unique()}`,
    slug: overrides.slug || `category-${unique()}`,
    ...overrides,
  });
}

async function createDefaultCertificateTemplate(createdBy) {
  return CertificateTemplate.create({
    name: `Default Template ${unique()}`,
    isDefault: true,
    createdBy: createdBy._id,
  });
}

async function addMinimumContent(courseId, owner) {
  const request = require('supertest');
  const app = require('../../src/app');
  const sectionRes = await request(app)
    .post(`/api/v1/courses/${courseId}/sections`)
    .set('Authorization', authHeader(owner))
    .send({ title: 'Getting Started', order: 0 });
  await request(app)
    .post(`/api/v1/courses/${courseId}/lessons`)
    .set('Authorization', authHeader(owner))
    .send({
      title: 'Welcome',
      section: sectionRes.body.data._id,
      order: 0,
      lessonType: 'video',
      videoUrl: 'https://res.cloudinary.com/demo/video/upload/v1/welcome.mp4',
      durationSeconds: 120,
    });
}

async function simulateWatching(student, courseId) {
  const Progress = require('../../src/models/Progress.model');
  const { Lesson } = require('../../src/models/Lesson.model');
  const lessons = await Lesson.find({ course: courseId, lessonType: 'video' });
  for (const lesson of lessons) {
    await Progress.updateOne(
      { student: student._id, lesson: lesson._id },
      { $set: { student: student._id, course: courseId, section: lesson.section, watchedSeconds: lesson.durationSeconds } },
      { upsert: true }
    );
  }
}

function objectId() {
  return new mongoose.Types.ObjectId().toString();
}

module.exports = {
  unique,
  createUser,
  tokenFor,
  authHeader,
  createCategory,
  createDefaultCertificateTemplate,
  addMinimumContent,
  simulateWatching,
  objectId,
};
