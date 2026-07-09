import type { Pool } from 'pg';
import { loadConfig } from './config.js';
import { checkProductionReadiness } from './config-validation.js';
import { buildContainer } from './container.js';
import { createApp } from './http/create-app.js';
import { createDb, migrate, type Db } from './adapters/sql/db.js';
import type { SchedulerLock } from './ports/scheduler-lock.js';
import { NoopSchedulerLock } from './adapters/noop-scheduler-lock.js';
import { PgAdvisorySchedulerLock } from './adapters/sql/pg-advisory-scheduler-lock.js';
import type { Logger } from './ports/logger.js';
import type { ApplicationController } from './http/application-controller.js';
import type { JobController } from './http/job-controller.js';
import type { AtsController } from './http/ats-controller.js';
import type { SavedSearchController } from './http/saved-search-controller.js';
import type { LlmController } from './http/llm-controller.js';
import type { MandateController } from './http/mandate-controller.js';
import type { TalentController } from './http/talent-controller.js';
import type { PlacementController } from './http/placement-controller.js';
import type { CandidacyController } from './http/candidacy-controller.js';
import type { RetentionController } from './http/retention-controller.js';
import type { MatchController } from './http/match-controller.js';
import type { MatchAiController } from './http/match-ai-controller.js';
import type { UsageController } from './http/usage-controller.js';
import type { ComplianceController } from './http/compliance-controller.js';
import type { ForecastController } from './http/forecast-controller.js';
import type { ObservationController } from './http/observation-controller.js';
import type { AssistantController } from './http/assistant-controller.js';
import type { ArtifactController } from './http/artifact-controller.js';
import type { AssistantService } from './services/assistant-service.js';
import type { MailService } from './services/mail-service.js';
import type { RetentionService } from './services/retention-service.js';
import type { MailController } from './http/mail-controller.js';
import { TEAM_SCOPE } from './http/current-user.js';
import type { DocumentController } from './http/document-controller.js';
import type { AttachmentController } from './http/attachment-controller.js';
import type { AuthController } from './http/auth-controller.js';
import type { MembersController } from './http/members-controller.js';
import type { InviteController } from './http/invite-controller.js';
import type { TenantAdminController } from './http/tenant-admin-controller.js';
import type { AccountController } from './http/account-controller.js';
import type { PasswordResetController } from './http/password-reset-controller.js';
import type { PlanProvider } from './ports/plan-provider.js';
import type { Authorizer } from './ports/authorizer.js';

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
  // The logger lives in the container (not built yet), so boot diagnostics go to
  // the console. The readiness check always runs; NODE_ENV only decides whether
  // an unsafe config is fatal or merely a loud warning (security audit #7) — so a
  // real deployment that forgot NODE_ENV=production can't boot silently on the
  // dev secret / filesystem store / non-Secure cookies.
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

  let db: Db | undefined;
  let pool: Pool | undefined;
  if (config.store === 'sql') {
    const conn = createDb(config.databaseUrl);
    await migrate(conn.pool);
    db = conn.db;
    pool = conn.pool;
  }

  const container = buildContainer(config, db);
  const logger = container.resolve<Logger>('logger');

  // Scheduler leader election (ADR-0030): with Postgres, only the instance that
  // wins each per-job advisory lock runs it, so scaling to N instances doesn't
  // duplicate the timed jobs below. The filesystem store is single-instance, so
  // the no-op lock (always leader) is correct there.
  const schedulerLock: SchedulerLock = pool
    ? new PgAdvisorySchedulerLock(pool)
    : new NoopSchedulerLock();

  const app = createApp({
    applicationController: container.resolve<ApplicationController>('applicationController'),
    jobController: container.resolve<JobController>('jobController'),
    atsController: container.resolve<AtsController>('atsController'),
    savedSearchController: container.resolve<SavedSearchController>('savedSearchController'),
    llmController: container.resolve<LlmController>('llmController'),
    mandateController: container.resolve<MandateController>('mandateController'),
    talentController: container.resolve<TalentController>('talentController'),
    placementController: container.resolve<PlacementController>('placementController'),
    candidacyController: container.resolve<CandidacyController>('candidacyController'),
    retentionController: container.resolve<RetentionController>('retentionController'),
    matchController: container.resolve<MatchController>('matchController'),
    matchAiController: container.resolve<MatchAiController>('matchAiController'),
    usageController: container.resolve<UsageController>('usageController'),
    complianceController: container.resolve<ComplianceController>('complianceController'),
    forecastController: container.resolve<ForecastController>('forecastController'),
    observationController: container.resolve<ObservationController>('observationController'),
    assistantController: container.resolve<AssistantController>('assistantController'),
    artifactController: container.resolve<ArtifactController>('artifactController'),
    mailController: container.resolve<MailController>('mailController'),
    documentController: container.resolve<DocumentController>('documentController'),
    attachmentController: container.resolve<AttachmentController>('attachmentController'),
    authController: container.resolve<AuthController>('authController'),
    membersController: container.resolve<MembersController>('membersController'),
    inviteController: container.resolve<InviteController>('inviteController'),
    tenantAdminController: container.resolve<TenantAdminController>('tenantAdminController'),
    accountController: container.resolve<AccountController>('accountController'),
    passwordResetController: container.resolve<PasswordResetController>('passwordResetController'),
    planProvider: container.resolve<PlanProvider>('planProvider'),
    authorizer: container.resolve<Authorizer>('authorizer'),
    config,
    logger,
  });

  // The assistant's scheduler: a light minute-tick asks the service whether a
  // run is due (enabled + interval elapsed). unref() keeps it from blocking
  // shutdown; failures are logged, never fatal.
  const assistantService = container.resolve<AssistantService>('assistantService');
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
  const mailService = container.resolve<MailService>('mailService');
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
  const retentionService = container.resolve<RetentionService>('retentionService');
  const retentionTimer = setInterval(() => {
    void schedulerLock.runExclusive('retention', () =>
      retentionService.runAutoAnonymizeIfDue(TEAM_SCOPE),
    );
  }, 60 * 60_000);
  retentionTimer.unref();

  const server = app.listen(config.port, () => {
    logger.info(
      { port: config.port },
      `Application suite running on http://localhost:${config.port}`,
    );
  });

  const shutdown = (signal: string) => {
    logger.info({ signal }, 'shutting down');
    server.close(() => process.exit(0));
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
