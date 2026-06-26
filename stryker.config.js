/** @type {import('@stryker-mutator/api/core').PartialStrykerOptions} */
module.exports = {
  testRunner: 'jest',
  jest: {
    configFile: 'jest.config.js',
  },
  mutate: [
    'server/src/**/*.ts',
    '!server/src/index.ts',
    '!server/src/container.ts',
    '!server/src/adapters/puppeteer-pdf-renderer.ts',
    '!server/src/adapters/pdf-lib-merger.ts',
    '!server/src/adapters/git-versioner.ts',
    '!server/src/adapters/pino-logger.ts',
  ],
  thresholds: {
    high: 85,
    low: 70,
    break: 60,
  },
  reporters: ['html', 'clear-text', 'progress'],
  htmlReporter: {
    fileName: 'reports/mutation/report.html',
  },
  timeoutMS: 20000,
  concurrency: 4,
};
