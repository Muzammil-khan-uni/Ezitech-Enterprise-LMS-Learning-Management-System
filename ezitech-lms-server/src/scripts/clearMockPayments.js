const { connectDB, disconnectDB } = require('../config/db');
const { Enrollment } = require('../models/Enrollment.model');
const UserSubscription = require('../models/UserSubscription.model');
const logger = require('../utils/logger');

async function clearMockPayments() {
  const apply = process.argv.includes('--apply');
  await connectDB();

  const [enrollments, subscriptions] = await Promise.all([
    Enrollment.countDocuments({ pricePaid: { $gt: 0 } }),
    UserSubscription.countDocuments({}),
  ]);

  logger.info(
    `Found ${enrollments} enrollment(s) with a recorded price and ${subscriptions} subscription record(s). ` +
      'None of these were charged: no payment gateway has ever been connected.'
  );

  if (!apply) {
    logger.info('Dry run - nothing changed. Re-run with --apply to zero the prices and delete the subscription records.');
    await disconnectDB();
    return;
  }

  await Enrollment.updateMany({ pricePaid: { $gt: 0 } }, { $set: { pricePaid: 0 } });
  await UserSubscription.deleteMany({});
  logger.info('Done: recorded prices set to 0 and subscription records removed.');
  await disconnectDB();
}

clearMockPayments().catch(async (err) => {
  logger.error('clearMockPayments failed', { err });
  process.exitCode = 1;
  await disconnectDB().catch(() => undefined);
});
