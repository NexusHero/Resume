import { Global, Module, type DynamicModule, type Provider } from '@nestjs/common';
import { createPersistence, type Persistence } from '../adapters/persistence-factory.js';
import type { Db } from '../adapters/sql/db.js';
import type { AppConfig } from '../config.js';
import type { Clock } from '../ports/clock.js';
import {
  CONFIG,
  CLOCK,
  DB,
  PERSISTENCE,
  API_KEY_STORE,
  APPLICATION_REPOSITORY,
  ARTIFACT_LOG_REPOSITORY,
  ASSISTANT_SETTINGS_STORE,
  ASSISTANT_SUGGESTION_REPOSITORY,
  ATTACHMENT_STORE,
  AUDIT_LOG,
  CANDIDACY_REPOSITORY,
  DOCUMENT_REPOSITORY,
  EMAIL_VERIFICATION_TOKEN_STORE,
  INTERVIEW_OBSERVATION_REPOSITORY,
  INVITE_REPOSITORY,
  MANDATE_REPOSITORY,
  PASSWORD_RESET_TOKEN_STORE,
  PLACEMENT_REPOSITORY,
  RETENTION_POLICY_STORE,
  SAVED_SEARCH_REPOSITORY,
  STAGE_TRANSITION_REPOSITORY,
  TALENT_REPOSITORY,
  TENANT_REPOSITORY,
  USAGE_METER,
  USER_REPOSITORY,
} from './tokens.js';

/** Each repository/store token, resolved out of the assembled Persistence bundle. */
const REPO_BINDINGS: ReadonlyArray<[symbol, keyof Persistence]> = [
  [APPLICATION_REPOSITORY, 'applicationRepository'],
  [AUDIT_LOG, 'auditLog'],
  [SAVED_SEARCH_REPOSITORY, 'savedSearchRepository'],
  [MANDATE_REPOSITORY, 'mandateRepository'],
  [TALENT_REPOSITORY, 'talentRepository'],
  [PLACEMENT_REPOSITORY, 'placementRepository'],
  [CANDIDACY_REPOSITORY, 'candidacyRepository'],
  [DOCUMENT_REPOSITORY, 'documentRepository'],
  [ATTACHMENT_STORE, 'attachmentStore'],
  [USER_REPOSITORY, 'userRepository'],
  [PASSWORD_RESET_TOKEN_STORE, 'passwordResetTokenStore'],
  [EMAIL_VERIFICATION_TOKEN_STORE, 'emailVerificationTokenStore'],
  [INVITE_REPOSITORY, 'inviteRepository'],
  [TENANT_REPOSITORY, 'tenantRepository'],
  [API_KEY_STORE, 'apiKeyStore'],
  [USAGE_METER, 'usageMeter'],
  [INTERVIEW_OBSERVATION_REPOSITORY, 'interviewObservationRepository'],
  [ASSISTANT_SETTINGS_STORE, 'assistantSettingsStore'],
  [RETENTION_POLICY_STORE, 'retentionPolicyStore'],
  [ASSISTANT_SUGGESTION_REPOSITORY, 'assistantSuggestionRepository'],
  [ARTIFACT_LOG_REPOSITORY, 'artifactLogRepository'],
  [STAGE_TRANSITION_REPOSITORY, 'stageTransitionRepository'],
];

const repoProviders: Provider[] = REPO_BINDINGS.map(([token, key]) => ({
  provide: token,
  useFactory: (p: Persistence) => p[key],
  inject: [PERSISTENCE],
}));

/**
 * Persistence composition (ADR-0051) — the store switch from `container.ts`:
 * file-backed by default (offline, dev, CI), Postgres when `STORE=sql`. The bundle
 * is assembled once by `createPersistence`, then each repository/store is
 * re-exported under its own injection token so services depend on the port, not
 * the bundle. `DB` is provided as `null` unless the root module overrides it with
 * a live Drizzle handle for the SQL path.
 */
@Global()
@Module({
  providers: [
    { provide: DB, useValue: null },
    {
      provide: PERSISTENCE,
      useFactory: (config: AppConfig, clock: Clock, db: Db | null): Persistence =>
        createPersistence({ config, clock, db: db ?? undefined }),
      inject: [CONFIG, CLOCK, DB],
    },
    ...repoProviders,
  ],
  // DB is exported (not just PERSISTENCE/the repos) so InfraModule's
  // RATE_LIMITER factory, the only consumer outside this module, can inject it
  // directly to reach the raw pool for SqlRateLimiter.
  exports: [PERSISTENCE, DB, ...REPO_BINDINGS.map(([token]) => token)],
})
export class PersistenceModule {
  /** The SQL path: the booted index.ts passes the migrated Drizzle handle in. */
  static forRoot(db: Db | null): DynamicModule {
    return {
      module: PersistenceModule,
      // Registered after the static metadata, so this DB wins over the null default.
      providers: [{ provide: DB, useValue: db }],
    };
  }
}
