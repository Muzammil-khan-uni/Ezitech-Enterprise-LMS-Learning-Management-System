const { Worker } = require('bullmq');
const { connection, emailQueue } = require('./queues');
const { sendMail } = require('../config/mailer');
const logger = require('../utils/logger');

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function safeSubject(value) {
  return String(value ?? '').replace(/[\r\n]+/g, ' ').trim();
}

function safeUrl(value) {
  try {
    const url = new URL(String(value));
    return url.protocol === 'https:' || url.protocol === 'http:' ? escapeHtml(url.toString()) : '#';
  } catch {
    return '#';
  }
}

const EMAIL_TEMPLATES = {
  welcome: ({ name }) => ({
    subject: 'Welcome to Ezitech LMS',
    html: `<p>Hi ${escapeHtml(name)},</p><p>Welcome aboard! Your account is ready - jump in and explore the course catalog whenever you're ready.</p>`,
  }),
  certificateIssued: ({ name, courseTitle, downloadUrl }) => ({
    subject: safeSubject(`Your certificate for ${courseTitle} is ready`),
    html: `<p>Hi ${escapeHtml(name)},</p><p>Congratulations on completing <strong>${escapeHtml(courseTitle)}</strong>! Your certificate is ready.</p><p><a href="${safeUrl(downloadUrl)}">Download your certificate</a></p>`,
  }),
  assignmentDeadline: ({ name, assessmentTitle, courseTitle, dueDate }) => ({
    subject: safeSubject(`Reminder: "${assessmentTitle}" is due soon`),
    html: `<p>Hi ${escapeHtml(name)},</p><p><strong>${escapeHtml(assessmentTitle)}</strong> in ${escapeHtml(courseTitle)} is due on ${escapeHtml(new Date(dueDate).toDateString())}. Don't forget to submit.</p>`,
  }),
  inviteUser: ({ name, role, setPasswordUrl }) => ({
    subject: 'You have been invited to Ezitech LMS',
    html: `<p>Hi ${escapeHtml(name)},</p><p>An administrator has created a <strong>${escapeHtml(String(role).replace('_', ' '))}</strong> account for you on Ezitech LMS. Set your password to activate it:</p><p><a href="${safeUrl(setPasswordUrl)}">Set your password</a></p><p>This link expires in 7 days.</p>`,
  }),
  passwordReset: ({ name, resetUrl }) => ({
    subject: 'Reset your Ezitech LMS password',
    html: `<p>Hi ${escapeHtml(name)},</p><p>We received a request to reset your password. If this was you, choose a new one here:</p><p><a href="${safeUrl(resetUrl)}">Reset your password</a></p><p>This link expires in 1 hour. If you didn't request this, you can safely ignore this email - your password will not be changed.</p>`,
  }),
  verifyEmail: ({ name, verifyUrl }) => ({
    subject: 'Verify your email address',
    html: `<p>Hi ${escapeHtml(name)},</p><p>Please confirm this is your email address:</p><p><a href="${safeUrl(verifyUrl)}">Verify my email</a></p><p>This link expires in 3 days.</p>`,
  }),
  passwordChanged: ({ name }) => ({
    subject: 'Your Ezitech LMS password was changed',
    html: `<p>Hi ${escapeHtml(name)},</p><p>The password for your account was just changed and you were signed out of your other devices. If this was you, no action is needed.</p><p>If it wasn't you, reset your password immediately from the sign-in page and contact an administrator.</p>`,
  }),
  accountLocked: ({ name, minutes }) => ({
    subject: 'Your Ezitech LMS account was temporarily locked',
    html: `<p>Hi ${escapeHtml(name)},</p><p>There were several failed attempts to sign in to your account, so it has been locked for ${escapeHtml(minutes)} minutes as a precaution.</p><p>If this was you, wait and try again. If it wasn't, reset your password from the sign-in page.</p>`,
  }),
  emailChangedNotice: ({ name, newEmail }) => ({
    subject: 'The email address on your Ezitech LMS account was changed',
    html: `<p>Hi ${escapeHtml(name)},</p><p>The email address on your account was changed to <strong>${escapeHtml(newEmail)}</strong>. If you made this change, no action is needed.</p><p>If you didn't, contact an administrator right away.</p>`,
  }),
};

async function enqueueEmail(templateName, to, data) {
  await emailQueue.add(
    'send-email',
    { templateName, to, data },
    { attempts: 3, backoff: { type: 'exponential', delay: 5000 } }
  );
}

function startEmailWorker() {
  const worker = new Worker(
    'email',
    async (job) => {
      const { templateName, to, data } = job.data;
      const template = EMAIL_TEMPLATES[templateName];
      if (!template) throw new Error(`Unknown email template: ${templateName}`);

      const { subject, html } = template(data);
      await sendMail({ to, subject, html });
    },
    { connection }
  );

  worker.on('failed', (job, err) => {
    logger.error(`Email job ${job?.id} failed after ${job?.attemptsMade} attempts: ${err.message}`);
  });

  worker.on('error', (err) => {
    logger.error(`Email worker error: ${err.message}`);
  });

  return worker;
}

module.exports = { enqueueEmail, startEmailWorker, EMAIL_TEMPLATES };
