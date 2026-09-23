const mongoose = require('mongoose');

const threadSchema = new mongoose.Schema(
  {
    course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
    lesson: { type: mongoose.Schema.Types.ObjectId, ref: 'Lesson', default: null },
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    body: { type: String, required: true, maxlength: 5000 },
    isAnnouncement: { type: Boolean, default: false },
    isPinned: { type: Boolean, default: false },
    isLocked: { type: Boolean, default: false },
    commentCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

threadSchema.index({ course: 1, isPinned: -1, createdAt: -1 });

module.exports = mongoose.model('Thread', threadSchema);
