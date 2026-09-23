const { connectDB, disconnectDB } = require('../config/db');
const { User } = require('../models/User.model');
const logger = require('../utils/logger');

async function seedAdmin() {
  const name = process.env.SEED_ADMIN_NAME;
  const email = process.env.SEED_ADMIN_EMAIL;
  const password = process.env.SEED_ADMIN_PASSWORD;

  if (!name || !email || !password) {
    logger.error(
      'Missing required env vars. Set SEED_ADMIN_NAME, SEED_ADMIN_EMAIL, and SEED_ADMIN_PASSWORD (at least 8 characters) and re-run.'
    );
    process.exitCode = 1;
    return;
  }
  if (password.length < 8) {
    logger.error('SEED_ADMIN_PASSWORD must be at least 8 characters (same rule as normal registration).');
    process.exitCode = 1;
    return;
  }

  await connectDB();

  const existing = await User.findOne({ email });
  if (existing) {
    logger.info(`A user with email ${email} already exists (role: ${existing.role}) - nothing to do.`);
    await disconnectDB();
    return;
  }

  await User.create({
    name,
    email,
    password,
    role: 'admin',
    isActive: true,
    isEmailVerified: true,
  });

  logger.info(`Admin account created: ${email}. You can log in now and use the Users screen to invite others.`);
  await disconnectDB();
}

seedAdmin()
  .catch((err) => {
    logger.error(`Seeding failed: ${err.message}`);
    process.exitCode = 1;
  })
  .finally(() => process.exit());
