/** @type {import('@stryker-mutator/api/core').PartialStrykerOptions} */
module.exports = {
  testRunner: 'jest',
  jest: {
    configFile: 'jest.config.js',
  },
  mutate: [
    'core/src/**/*.ts',
    '!core/src/index.ts',
    '!core/src/container.ts',
    '!core/src/adapters/puppeteer-pdf-renderer.ts',
    '!core/src/adapters/pdf-lib-merger.ts',
    '!core/src/adapters/git-versioner.ts',
    '!core/src/adapters/pino-logger.ts',
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
