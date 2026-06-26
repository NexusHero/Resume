/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/server'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  collectCoverageFrom: [
    'server/src/**/*.ts',
    // Composition root and genuinely side-effecting adapters (real Chromium,
    // real git, process bootstrap) are exercised by manual/integration runs,
    // not unit-covered. All business logic below stays in scope.
    '!server/src/index.ts',
    '!server/src/container.ts',
    '!server/src/adapters/puppeteer-pdf-renderer.ts',
    '!server/src/adapters/pdf-lib-merger.ts',
    '!server/src/adapters/git-versioner.ts',
    '!server/src/adapters/pino-logger.ts',
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
