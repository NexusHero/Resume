import 'reflect-metadata';
import type { Pool } from 'pg';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { loadConfig } from './config.js';
import { checkProductionReadiness } from './config-validation.js';
import { createDb, migrate, type Db } from './adapters/sql/db.js';
import type { SchedulerLock } from './ports/scheduler-lock.js';
import { NoopSchedulerLock } from './adapters/noop-scheduler-lock.js';
import { PgAdvisorySchedulerLock } from './adapters/sql/pg-advisory-scheduler-lock.js';
import type { Logger } from './ports/logger.js';
import type { AssistantService } from './services/assistant-service.js';
import type { MailService } from './services/mail-service.js';
import type { RetentionService } from './services/retention-service.js';
import { TEAM_SCOPE } from './http/current-user.js';
import { AppModule } from './nest/app.module.js';
import { configureHttpEdge } from './nest/http-edge.js';
import { ProblemJsonFilter } from './nest/problem-json.filter.js';
import {
  LOGGER,
  ASSISTANT_SERVICE,
  MAIL_SERVICE,
  RETENTION_SERVICE,
  AUTH_ENGINE,
} from './nest/tokens.js';
import type { AuthEngine } from './ports/auth-engine.js';

async function main(): Promise<void> {
  const config = loadConfig();

  // Better-Auth (ADR-0043) signs sessions with our resolved APP_SECRET (passed
  // explicitly as `secret`), but it also reads BETTER_AUTH_SECRET from the env
  // for its own default and warns when that is unset/weak. Mirror the resolved
  // secret into the env so the two agree and the warning is not misleading — the
  // readiness gate already refuses to boot on the insecure dev default.
  if (!process.env.BETTER_AUTH_SECRET) {
    process.env.BETTER_AUTH_SECRET = config.security.encryptionSecret;
  }

  // Fail fast on an unsafe production config before touching the DB (ADR-0029).
  // Boot diagnostics go to the console (the logger lives in the Nest container,
  // not built yet). The readiness check always runs; NODE_ENV only decides
  // whether an unsafe config is fatal or merely a loud warning (security audit
  // #7) — so a real deployment that forgot NODE_ENV=production can't boot
  // silently on the dev secret / filesystem store / non-Secure cookies.
  const { errors, warnings } = checkProductionReadiness(config);
  for (const w of warnings) console.warn(`[config] warning: ${w}`);
  if (errors.length > 0) {
    if (process.env.NODE_ENV === 'production') {
      for (const e of errors) console.error(`[config] error: ${e}`);
      console.error('[config] Refusing to start: fix the production configuration above.');
      process.exit(1);
    }
    console.warn(
      '[config] Running with development defaults (NODE_ENV is not "production") — ' +
        'NOT safe for a real deployment. Set NODE_ENV=production and fix:',
    );
    for (const e of errors) console.warn(`[config]   - ${e}`);
  }

  let db: Db | null = null;
  let pool: Pool | undefined;
  if (config.store === 'sql') {
    const conn = createDb(config.databaseUrl);
    await migrate(conn.pool);
    db = conn.db;
    pool = conn.pool;
  }

  // The NestJS composition root (ADR-0051): AppModule replaces container.ts and
  // create-app.ts. Body parsing is ours (two-tier limits in the http edge) and
  // Nest's own logger stays off — pino is the application logger.
  const app = await NestFactory.create<NestExpressApplication>(AppModule.forRoot(db), {
    bodyParser: false,
    logger: false,
  });
  const logger = app.get<Logger>(LOGGER);
  configureHttpEdge(app, config);
  app.useGlobalFilters(new ProblemJsonFilter(logger));

  // Scheduler leader election (ADR-0030): with Postgres, only the instance that
  // wins each per-job advisory lock runs it, so scaling to N instances doesn't
  // duplicate the timed jobs below. The filesystem store is single-instance, so
  // the no-op lock (always leader) is correct there.
  const schedulerLock: SchedulerLock = pool
    ? new PgAdvisorySchedulerLock(pool)
    : new NoopSchedulerLock();

  // The assistant's scheduler: a light minute-tick asks the service whether a
  // run is due (enabled + interval elapsed). unref() keeps it from blocking
  // shutdown; failures are logged, never fatal.
  const assistantService = app.get<AssistantService>(ASSISTANT_SERVICE);
  const assistantTimer = setInterval(() => {
    schedulerLock
      .runExclusive('assistant', () => assistantService.runIfDue(TEAM_SCOPE).then(() => {}))
      .catch((err: unknown) => {
        logger.warn(
          { err: err instanceof Error ? err.message : String(err) },
          'assistant scheduled run failed',
        );
      });
  }, 60_000);
  assistantTimer.unref();

  // Reply detection: poll the configured IMAP mailbox so pending email
  // outreach resolves itself. Off entirely without MAIL_IMAP_HOST.
  const mailService = app.get<MailService>(MAIL_SERVICE);
  if (mailService.replySyncEnabled) {
    const pollMs = config.mail.imap.pollMinutes * 60_000;
    const replyTimer = setInterval(() => {
      void schedulerLock.runExclusive('reply-sync', () =>
        mailService.syncRepliesSafely(TEAM_SCOPE),
      );
    }, pollMs);
    replyTimer.unref();
    logger.info(
      { pollMinutes: config.mail.imap.pollMinutes },
      'reply sync enabled (IMAP mailbox configured)',
    );
  }

  // Löschfristen-Automatik: an hourly sweep anonymizes candidates past the
  // deletion deadline — but only for teams whose policy opts in (checked each
  // tick). unref()ed, never fatal.
  const retentionService = app.get<RetentionService>(RETENTION_SERVICE);
  const retentionTimer = setInterval(() => {
    void schedulerLock.runExclusive('retention', () =>
      retentionService.runAutoAnonymizeIfDue(TEAM_SCOPE),
    );
  }, 60 * 60_000);
  retentionTimer.unref();

  await app.listen(config.port);
  logger.info(
    { port: config.port },
    `Application suite running on http://localhost:${config.port}`,
  );

  const authEngine = app.get<AuthEngine>(AUTH_ENGINE);
  const shutdown = (signal: string) => {
    logger.info({ signal }, 'shutting down');
    void Promise.all([app.close(), authEngine.close?.()]).then(() => process.exit(0));
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
