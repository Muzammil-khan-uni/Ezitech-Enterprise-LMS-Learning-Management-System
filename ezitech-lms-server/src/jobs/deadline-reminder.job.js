const { Worker } = require('bullmq');
const { connection, reminderQueue } = require('./queues');
const logger = require('../utils/logger');

const REMINDER_WINDOW_HOURS = 24;

async function scanForUpcomingDeadlines() {
  const { Assessment } = require('../models/Assessment.model');
  const { Enrollment } = require('../models/Enrollment.model');
  const { Submission } = require('../models/Submission.model');
  const { Notification } = require('../models/Notification.model');
  const notificationsService = require('../modules/notifications/notifications.service');
  const { enqueueEmail } = require('./email.job');

  const now = new Date();
  const windowEnd = new Date(now.getTime() + REMINDER_WINDOW_HOURS * 60 * 60 * 1000);

  const dueSoon = await Assessment.find({
    isPublished: true,
    dueDate: { $gte: now, $lte: windowEnd },
  }).populate('course', 'title');

  let notifiedCount = 0;

  for (const assessment of dueSoon) {
    const enrollments = await Enrollment.find({
      course: assessment.course._id,
      status: 'active',
    }).populate('student', 'name email');

    for (const enrollment of enrollments) {
      const hasSubmitted = await Submission.exists({
        assessment: assessment._id,
        student: enrollment.student._id,
        status: { $ne: 'in_progress' },
      });
      if (hasSubmitted) continue;

      const alreadyReminded = await Notification.exists({
        user: enrollment.student._id,
        type: 'assignment_deadline',
        relatedEntityId: assessment._id,
      });
      if (alreadyReminded) continue;

      await notificationsService.notify(enrollment.student._id, {
        type: 'assignment_deadline',
        title: `"${assessment.title}" is due soon`,
        message: `Due ${assessment.dueDate.toDateString()} in ${assessment.course.title}`,
        relatedEntityType: 'assessment',
        relatedEntityId: assessment._id,
      });

      await enqueueEmail('assignmentDeadline', enrollment.student.email, {
        name: enrollment.student.name,
        assessmentTitle: assessment.title,
        courseTitle: assessment.course.title,
        dueDate: assessment.dueDate,
      });

      notifiedCount += 1;
    }
  }

  logger.info(`Deadline reminder scan complete: ${notifiedCount} students notified across ${dueSoon.length} assessments`);
  return notifiedCount;
}

async function scheduleDeadlineReminders() {
  await reminderQueue.add(
    'scan',
    {},
    { repeat: { every: 60 * 60 * 1000 }, jobId: 'deadline-scan-hourly' }
  );
}

function startReminderWorker() {
  const worker = new Worker('deadline-reminders', () => scanForUpcomingDeadlines(), { connection });

  worker.on('failed', (job, err) => {
    logger.error(`Reminder scan job failed: ${err.message}`);
  });
  worker.on('error', (err) => {
    logger.error(`Reminder worker error: ${err.message}`);
  });

  return worker;
}

module.exports = { scanForUpcomingDeadlines, scheduleDeadlineReminders, startReminderWorker };
