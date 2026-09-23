const mongoose = require('mongoose');

const learningPathSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 200 },
    slug: { type: String, required: true, unique: true, lowercase: true },
    description: { type: String, maxlength: 3000 },
    level: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced'],
      required: true,
    },
    courses: [
      {
        course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
        order: { type: Number, required: true },
      },
    ],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    isPublished: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model('LearningPath', learningPathSchema);
