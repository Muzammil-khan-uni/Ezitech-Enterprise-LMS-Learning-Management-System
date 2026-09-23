const mongoose = require('mongoose');

const courseReviewSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, maxlength: 2000 },
  },
  { timestamps: true }
);

courseReviewSchema.index({ student: 1, course: 1 }, { unique: true });

module.exports = mongoose.model('CourseReview', courseReviewSchema);
