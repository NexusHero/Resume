import { loadConfig } from './config';
import { checkProductionReadiness } from './config-validation';
import { buildContainer } from './container';
import { createApp } from './http/create-app';
import { createDb, migrate, type Db } from './adapters/sql/db';
import type { Logger } from './ports/logger';
import type { ApplicationController } from './http/application-controller';
import type { JobController } from './http/job-controller';
import type { AtsController } from './http/ats-controller';
import type { SavedSearchController } from './http/saved-search-controller';
import type { LlmController } from './http/llm-controller';
import type { MandateController } from './http/mandate-controller';
import type { TalentController } from './http/talent-controller';
import type { PlacementController } from './http/placement-controller';
import type { CandidacyController } from './http/candidacy-controller';
import type { RetentionController } from './http/retention-controller';
import type { MatchController } from './http/match-controller';
import type { MatchAiController } from './http/match-ai-controller';
import type { UsageController } from './http/usage-controller';
import type { ComplianceController } from './http/compliance-controller';
import type { ForecastController } from './http/forecast-controller';
import type { ObservationController } from './http/observation-controller';
import type { AssistantController } from './http/assistant-controller';
import type { ArtifactController } from './http/artifact-controller';
import type { AssistantService } from './services/assistant-service';
import type { MailService } from './services/mail-service';
import type { RetentionService } from './services/retention-service';
import type { MailController } from './http/mail-controller';
import { TEAM_SCOPE } from './http/current-user';
import type { DocumentController } from './http/document-controller';
import type { AttachmentController } from './http/attachment-controller';
import type { AuthController } from './http/auth-controller';
import type { MembersController } from './http/members-controller';
import type { AccountController } from './http/account-controller';
import type { PasswordResetController } from './http/password-reset-controller';
import type { PlanProvider } from './ports/plan-provider';

async function main(): Promise<void> {
  const config = loadConfig();

  // Fail fast on an unsafe production config before touching the DB (ADR-0029).
  // The logger lives in the container (not built yet), so boot diagnostics go to
  // the console.
  if (process.env.NODE_ENV === 'production') {
    const { errors, warnings } = checkProductionReadiness(config);
    for (const w of warnings) console.warn(`[config] warning: ${w}`);
    if (errors.length > 0) {
      for (const e of errors) console.error(`[config] error: ${e}`);
      console.error('[config] Refusing to start: fix the production configuration above.');
      process.exit(1);
    }
  }

  let db: Db | undefined;
  if (config.store === 'sql') {
    const conn = createDb(config.databaseUrl);
    await migrate(conn.pool);
    db = conn.db;
  }

  const container = buildContainer(config, db);
  const logger = container.resolve<Logger>('logger');

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
    accountController: container.resolve<AccountController>('accountController'),
    passwordResetController: container.resolve<PasswordResetController>('passwordResetController'),
    planProvider: container.resolve<PlanProvider>('planProvider'),
    config,
    logger,
  });

  // The assistant's scheduler: a light minute-tick asks the service whether a
  // run is due (enabled + interval elapsed). unref() keeps it from blocking
  // shutdown; failures are logged, never fatal.
  const assistantService = container.resolve<AssistantService>('assistantService');
  const assistantTimer = setInterval(() => {
    assistantService.runIfDue(TEAM_SCOPE).catch((err: unknown) => {
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
      void mailService.syncRepliesSafely(TEAM_SCOPE);
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
    void retentionService.runAutoAnonymizeIfDue(TEAM_SCOPE);
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
