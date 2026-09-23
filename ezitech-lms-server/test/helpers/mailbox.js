const { Queue } = require('bullmq');

function lastEmailTo(email, templateName) {
  const queue = Queue.registry.get('email');
  if (!queue) return undefined;

  return [...queue.jobs]
    .reverse()
    .find((job) => job.data.to === email && (!templateName || job.data.templateName === templateName));
}

function extractTokenFromUrl(url) {
  const match = url.match(/[?&]token=([^&]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

module.exports = { lastEmailTo, extractTokenFromUrl };
