module.exports = {
  testEnvironment: 'node',
  rootDir: '.',
  testMatch: ['<rootDir>/test/**/*.test.js'],
  globalSetup: '<rootDir>/test/setup/globalSetup.js',
  globalTeardown: '<rootDir>/test/setup/globalTeardown.js',
  setupFilesAfterEnv: ['<rootDir>/test/setup/jestSetupAfterEnv.js'],
  testTimeout: 20000,
  verbose: true,
};
