const mongoose = require('mongoose');

const instructorProfileSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    bio: { type: String, maxlength: 2000 },
    expertise: [String],
    socialLinks: {
      website: String,
      linkedin: String,
      github: String,
    },
    payoutDetails: {
      type: mongoose.Schema.Types.Mixed,
      select: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('InstructorProfile', instructorProfileSchema);
