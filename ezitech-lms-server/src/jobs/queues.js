const { Queue } = require('bullmq');
const env = require('../config/env');

const connection = { url: env.redisUrl, maxRetriesPerRequest: null };

const emailQueue = new Queue('email', { connection });
const reminderQueue = new Queue('deadline-reminders', { connection });

module.exports = { connection, emailQueue, reminderQueue };
