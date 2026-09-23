const mongoose = require('mongoose');

const sectionSchema = new mongoose.Schema(
  {
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: true,
      index: true,
    },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    order: { type: Number, required: true },
  },
  { timestamps: true }
);

sectionSchema.index({ course: 1, order: 1 });

module.exports = mongoose.model('Section', sectionSchema);
