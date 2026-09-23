const nodemailer = require('nodemailer');
const env = require('./env');
const logger = require('../utils/logger');

let transporterPromise = null;

async function getTransporter() {
  if (transporterPromise) return transporterPromise;

  transporterPromise = (async () => {
    if (env.smtp.host) {
      return nodemailer.createTransport({
        host: env.smtp.host,
        port: env.smtp.port,
        secure: env.smtp.port === 465,
        auth: env.smtp.user ? { user: env.smtp.user, pass: env.smtp.pass } : undefined,
      });
    }

    if (env.isProduction) {
      throw new Error('SMTP_HOST is required in production - no test fallback is used outside development');
    }

    const testAccount = await nodemailer.createTestAccount();
    logger.warn('No SMTP config found - using an Ethereal test account for outgoing email (dev only)');
    return nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: { user: testAccount.user, pass: testAccount.pass },
    });
  })();

  return transporterPromise;
}

async function sendMail({ to, subject, html, text }) {
  const transporter = await getTransporter();
  const info = await transporter.sendMail({
    from: env.smtp.from,
    to,
    subject,
    text,
    html,
  });

  const previewUrl = nodemailer.getTestMessageUrl(info);
  if (previewUrl) {
    logger.info(`Email preview (dev/Ethereal): ${previewUrl}`);
  }

  return info;
}

module.exports = { sendMail };
