const env = require('../config/env');
const ApiError = require('./ApiError');

function assertPaymentsEnabled(message = 'Paid courses and subscriptions are not available yet') {
  if (!env.paymentsEnabled) throw new ApiError(402, message);
}

module.exports = { assertPaymentsEnabled };
