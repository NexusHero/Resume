import { loadConfig } from './config';
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
import { TEAM_SCOPE } from './http/current-user';
import type { DocumentController } from './http/document-controller';
import type { AttachmentController } from './http/attachment-controller';
import type { AuthController } from './http/auth-controller';
import type { MembersController } from './http/members-controller';
import type { AccountController } from './http/account-controller';
import type { PasswordResetController } from './http/password-reset-controller';

async function main(): Promise<void> {
  const config = loadConfig();

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
    documentController: container.resolve<DocumentController>('documentController'),
    attachmentController: container.resolve<AttachmentController>('attachmentController'),
    authController: container.resolve<AuthController>('authController'),
    membersController: container.resolve<MembersController>('membersController'),
    accountController: container.resolve<AccountController>('accountController'),
    passwordResetController: container.resolve<PasswordResetController>('passwordResetController'),
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
