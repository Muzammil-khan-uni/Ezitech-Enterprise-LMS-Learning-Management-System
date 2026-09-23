const mongoose = require('mongoose');

const LESSON_TYPES = ['video', 'pdf', 'assignment', 'download'];

const baseOptions = {
  discriminatorKey: 'lessonType',
  timestamps: true,
};

const lessonSchema = new mongoose.Schema(
  {
    course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
    section: { type: mongoose.Schema.Types.ObjectId, ref: 'Section', required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    order: { type: Number, required: true },
    isPreview: { type: Boolean, default: false },
    prerequisiteLessons: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Lesson' }],
  },
  baseOptions
);

lessonSchema.index({ section: 1, order: 1 });

const Lesson = mongoose.model('Lesson', lessonSchema);

const VideoLesson = Lesson.discriminator(
  'video',
  new mongoose.Schema({
    videoUrl: { type: String, required: true },
    durationSeconds: { type: Number, required: true },
    captionsUrl: String,
  })
);

const PdfLesson = Lesson.discriminator(
  'pdf',
  new mongoose.Schema({
    fileUrl: { type: String, required: true },
    pageCount: Number,
  })
);

const AssignmentLesson = Lesson.discriminator(
  'assignment',
  new mongoose.Schema({
    instructions: { type: String, required: true, maxlength: 5000 },
    dueDate: Date,
    maxScore: { type: Number, default: 100 },
    allowedFileTypes: [String],
    rubric: String,
  })
);

const DownloadLesson = Lesson.discriminator(
  'download',
  new mongoose.Schema({
    fileUrl: { type: String, required: true },
    fileName: String,
    fileSizeBytes: Number,
  })
);

const ScormLesson = Lesson.discriminator(
  'scorm',
  new mongoose.Schema({
    packageUrl: { type: String, required: true },
    entryPoint: { type: String, required: true },
    scormVersion: { type: String, enum: ['1.2'], default: '1.2' },
    maxScore: { type: Number, default: 100 },
  })
);

module.exports = {
  Lesson,
  VideoLesson,
  PdfLesson,
  AssignmentLesson,
  DownloadLesson,
  ScormLesson,
  LESSON_TYPES: [...LESSON_TYPES, 'scorm'],
};
