const mongoose = require('mongoose');

const COURSE_STATUS = ['draft', 'published', 'archived'];
const COURSE_LANGUAGES = ['en', 'ur'];

const courseSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 200 },
    slug: { type: String, required: true, unique: true, lowercase: true, index: true },
    description: { type: String, maxlength: 5000 },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CourseCategory',
      required: true,
    },
    tags: [{ type: String, trim: true, lowercase: true }],

    instructor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    prerequisites: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Course' }],

    mentors: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
      select: false,
      default: [],
    },

    thumbnailUrl: String,

    level: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced'],
      default: 'beginner',
    },

    price: { type: Number, default: 0, min: 0 },

    language: { type: String, enum: COURSE_LANGUAGES, default: 'en' },

    status: {
      type: String,
      enum: COURSE_STATUS,
      default: 'draft',
      index: true,
    },

    contentVersion: { type: Number, default: 1 },

    publishedAt: Date,
  },
  { timestamps: true }
);

courseSchema.index(
  { title: 'text', description: 'text', tags: 'text' },
  { language_override: 'textIndexLanguage' }
);

courseSchema.index({ status: 1, createdAt: -1 });
courseSchema.index({ status: 1, category: 1 });
courseSchema.index({ status: 1, instructor: 1 });

module.exports = { Course: mongoose.model('Course', courseSchema), COURSE_STATUS, COURSE_LANGUAGES };
