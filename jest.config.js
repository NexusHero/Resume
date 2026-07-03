/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/server'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  // Transpile-only: skip ts-jest's per-suite type-checking of the whole import
  // graph (the dominant cost — it made every suite pay ~40s and drove the CI
  // run to ~9 min). Type safety is not lost: `npm run typecheck` (tsc) is a
  // separate, required CI gate that checks the whole project once.
  transform: {
    '^.+\\.ts$': ['ts-jest', { isolatedModules: true }],
  },
  collectCoverageFrom: [
    'server/src/**/*.ts',
    // Composition root and genuinely side-effecting adapters (real Chromium,
    // real git, process bootstrap) are exercised by manual/integration runs,
    // not unit-covered. All business logic below stays in scope.
    '!server/src/index.ts',
    '!server/src/container.ts',
    '!server/src/adapters/puppeteer-pdf-renderer.ts',
    '!server/src/adapters/pdf-lib-merger.ts',
    // Text extraction runs Mozilla's pdf.js against a real PDF binary — exercised
    // by a manual/integration smoke, not unit-covered (the port has a fake).
    '!server/src/adapters/pdfjs-text-extractor.ts',
    '!server/src/adapters/git-versioner.ts',
    '!server/src/adapters/pino-logger.ts',
    '!server/src/adapters/node-fetch.ts',
    // Real S3 SDK I/O; the pure key/prefix logic in s3-pdf-archive.ts and the
    // factory selection are unit-covered, the network wrapper is exercised in
    // deployment against a real bucket.
    '!server/src/adapters/aws-s3-putter.ts',
    // SMTP mailer talks to a real relay (nodemailer) — exercised by deployment,
    // not unit-covered; the console mailer and the factory selection are.
    '!server/src/adapters/smtp-mailer.ts',
    // SQL: the DB connection and the thin Drizzle CRUD glue are exercised by the
    // DATABASE_URL-gated integration test, not unit-covered (pure mappers are).
    '!server/src/adapters/sql/db.ts',
    '!server/src/adapters/sql/sql-application-repository.ts',
    '!server/src/adapters/sql/sql-audit-log.ts',
    '!server/src/adapters/sql/sql-saved-search-repository.ts',
    '!server/src/adapters/sql/sql-mandate-repository.ts',
    '!server/src/adapters/sql/sql-talent-repository.ts',
    '!server/src/adapters/sql/sql-placement-repository.ts',
    '!server/src/adapters/sql/sql-candidacy-repository.ts',
    '!server/src/adapters/sql/sql-user-repository.ts',
    '!server/src/adapters/sql/sql-session-store.ts',
    '!server/src/adapters/sql/sql-password-reset-token-store.ts',
    '!server/src/adapters/sql/sql-api-key-store.ts',
    '!server/src/adapters/sql/sql-document-repository.ts',
    '!server/src/adapters/sql/sql-attachment-store.ts',
    '!server/src/adapters/sql/sql-usage-meter.ts',
    '!server/src/adapters/sql/sql-interview-observation-repository.ts',
    '!server/src/adapters/sql/sql-assistant-store.ts',
    '!server/src/adapters/sql/sql-artifact-log-repository.ts',
    '!server/src/adapters/sql/sql-stage-transition-repository.ts',
    '!server/src/adapters/sql/sql-retention-policy-store.ts',
    '!server/src/adapters/sql/sql-email-verification-token-store.ts',
    // IMAP reply detection talks to a real mailbox (imapflow) — exercised by
    // deployment, not unit-covered; the matching domain and the port fake are.
    '!server/src/adapters/imap-inbox-source.ts',
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
