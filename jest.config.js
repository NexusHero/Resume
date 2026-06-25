/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/core'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  collectCoverageFrom: [
    'core/src/**/*.ts',
    // Composition root and genuinely side-effecting adapters (real Chromium,
    // real git, process bootstrap) are exercised by manual/integration runs,
    // not unit-covered. All business logic below stays in scope.
    '!core/src/index.ts',
    '!core/src/container.ts',
    '!core/src/adapters/puppeteer-pdf-renderer.ts',
    '!core/src/adapters/pdf-lib-merger.ts',
    '!core/src/adapters/git-versioner.ts',
    '!core/src/adapters/pino-logger.ts',
  ],
  coverageDirectory: 'coverage',
  coverageThreshold: {
    global: {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90,
    },
  },
};
