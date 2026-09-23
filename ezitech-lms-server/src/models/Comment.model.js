const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema(
  {
    thread: { type: mongoose.Schema.Types.ObjectId, ref: 'Thread', required: true, index: true },
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    body: { type: String, required: true, maxlength: 3000 },
    parentComment: { type: mongoose.Schema.Types.ObjectId, ref: 'Comment', default: null },
    isInstructorReply: { type: Boolean, default: false },
  },
  { timestamps: true }
);

commentSchema.index({ thread: 1, createdAt: 1 });

module.exports = mongoose.model('Comment', commentSchema);
