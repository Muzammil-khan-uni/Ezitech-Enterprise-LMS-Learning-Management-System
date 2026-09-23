const mongoose = require('mongoose');

const courseCategorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
    description: String,
    parentCategory: { type: mongoose.Schema.Types.ObjectId, ref: 'CourseCategory', default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('CourseCategory', courseCategorySchema);
