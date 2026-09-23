const Thread = require('../../models/Thread.model');
const Comment = require('../../models/Comment.model');
const ApiError = require('../../utils/ApiError');
const notificationsService = require('../notifications/notifications.service');
const { Lesson } = require('../../models/Lesson.model');
const courseAccess = require('../../utils/courseAccess');

async function assertCanAccessCourseDiscussion(courseId, reqUser) {
  const access = await courseAccess.getAccess(courseId, reqUser);
  if (access.canModerate) return access;

  if (!(await courseAccess.isEnrolled(courseId, reqUser))) {
    throw ApiError.forbidden('You must be enrolled in this course to access its discussion board');
  }
  return access;
}

async function createThread(courseId, data, author) {
  const access = await assertCanAccessCourseDiscussion(courseId, author);

  if (data.isAnnouncement && !access.canManage) {
    throw ApiError.forbidden('Only the course instructor or an administrator can post announcements');
  }
  if (data.lesson && !(await Lesson.exists({ _id: data.lesson, course: courseId }))) {
    throw ApiError.badRequest('That lesson does not belong to this course');
  }

  const thread = await Thread.create({
    course: courseId,
    lesson: data.lesson || null,
    author: author.id,
    title: data.title,
    body: data.body,
    isAnnouncement: !!data.isAnnouncement,
  });

  if (thread.isAnnouncement) {
    await notificationsService.notifyEnrolledStudents(courseId, {
      type: 'announcement',
      title: `New announcement: ${thread.title}`,
      message: thread.body.slice(0, 200),
      relatedEntityType: 'thread',
      relatedEntityId: thread._id,
    });
  }

  return thread;
}

async function listThreads(courseId, { lesson, announcementsOnly } = {}, reqUser) {
  await assertCanAccessCourseDiscussion(courseId, reqUser);

  const filter = { course: courseId };
  if (lesson) filter.lesson = lesson;
  if (announcementsOnly) filter.isAnnouncement = true;
  return Thread.find(filter).populate('author', 'name role').sort({ isPinned: -1, createdAt: -1 });
}

async function getThread(threadId, reqUser) {
  const thread = await Thread.findById(threadId).populate('author', 'name role');
  if (!thread) throw ApiError.notFound('Thread not found');
  await assertCanAccessCourseDiscussion(thread.course, reqUser);
  return thread;
}

async function setThreadFlags(threadId, updates, requester) {
  const thread = await Thread.findById(threadId);
  if (!thread) throw ApiError.notFound('Thread not found');

  const isOwner = thread.author.toString() === requester.id;
  const { canManage } = await courseAccess.getAccess(thread.course, requester);
  if (!isOwner && !canManage) throw ApiError.forbidden('You cannot modify this thread');

  if ((updates.isPinned !== undefined || updates.isLocked !== undefined) && !canManage) {
    throw ApiError.forbidden('Only the course instructor or an administrator can pin or lock threads');
  }

  Object.assign(thread, updates);
  await thread.save();
  return thread;
}

async function deleteThread(threadId, requester) {
  const thread = await Thread.findById(threadId);
  if (!thread) throw ApiError.notFound('Thread not found');

  const isOwner = thread.author.toString() === requester.id;
  if (!isOwner) {
    const { canManage } = await courseAccess.getAccess(thread.course, requester);
    if (!canManage) throw ApiError.forbidden('You cannot delete this thread');
  }

  await Comment.deleteMany({ thread: threadId });
  await thread.deleteOne();
}

async function addComment(threadId, body, parentComment, author) {
  const thread = await Thread.findById(threadId);
  if (!thread) throw ApiError.notFound('Thread not found');
  const access = await assertCanAccessCourseDiscussion(thread.course, author);
  if (thread.isLocked) throw ApiError.badRequest('This thread is locked for new replies');
  if (parentComment && !(await Comment.exists({ _id: parentComment, thread: threadId }))) {
    throw ApiError.badRequest('That reply does not belong to this thread');
  }

  const comment = await Comment.create({
    thread: threadId,
    author: author.id,
    body,
    parentComment: parentComment || null,
    isInstructorReply: access.canModerate,
  });

  thread.commentCount += 1;
  await thread.save();

  if (thread.author.toString() !== author.id) {
    await notificationsService.notify(thread.author, {
      type: 'announcement',
      title: 'New reply to your question',
      message: body.slice(0, 200),
      relatedEntityType: 'thread',
      relatedEntityId: thread._id,
    });
  }

  return comment;
}

async function listComments(threadId, reqUser) {
  const thread = await Thread.findById(threadId).select('course');
  if (!thread) throw ApiError.notFound('Thread not found');
  await assertCanAccessCourseDiscussion(thread.course, reqUser);
  return Comment.find({ thread: threadId }).populate('author', 'name role').sort('createdAt');
}

async function deleteComment(commentId, requester) {
  const comment = await Comment.findById(commentId);
  if (!comment) throw ApiError.notFound('Comment not found');

  const isOwner = comment.author.toString() === requester.id;
  if (!isOwner) {
    const thread = await Thread.findById(comment.thread).select('course');
    const { canManage } = await courseAccess.getAccess(thread.course, requester);
    if (!canManage) throw ApiError.forbidden('You cannot delete this comment');
  }

  await comment.deleteOne();
  await Thread.findByIdAndUpdate(comment.thread, { $inc: { commentCount: -1 } });
}

module.exports = {
  createThread,
  listThreads,
  getThread,
  setThreadFlags,
  deleteThread,
  addComment,
  listComments,
  deleteComment,
};
