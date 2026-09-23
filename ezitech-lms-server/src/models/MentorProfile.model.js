const mongoose = require('mongoose');

const mentorProfileSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    bio: { type: String, maxlength: 2000 },
    expertise: [String],
    assignedCourses: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Course' }],
  },
  { timestamps: true }
);

module.exports = mongoose.model('MentorProfile', mentorProfileSchema);
