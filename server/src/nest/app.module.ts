import { Controller, Get, Module, type DynamicModule } from '@nestjs/common';
import type { Db } from '../adapters/sql/db.js';
import { CoreModule } from './core.module.js';
import { PersistenceModule } from './persistence.module.js';
import { InfraModule } from './infra.module.js';
import { AuthModule } from './auth/auth.module.js';
import { RegistriesModule } from './registries.module.js';
import { AiModule } from './ai/ai.module.js';
import { ApplicationsModule } from './applications/applications.module.js';
import { JobsModule } from './jobs/jobs.module.js';
import { AtsModule } from './ats/ats.module.js';
import { SearchesModule } from './searches/searches.module.js';
import { MandatesModule } from './mandates/mandates.module.js';
import { TalentsModule } from './talents/talents.module.js';
import { TalentImportModule } from './talents/talent-import.module.js';
import { PlacementsModule } from './placements/placements.module.js';
import { CandidaciesModule } from './candidacies/candidacies.module.js';
import { ObservationsModule } from './observations/observations.module.js';
import { ForecastModule } from './forecast/forecast.module.js';
import { UsageModule } from './usage/usage.module.js';
import { MembersModule } from './members/members.module.js';
import { InvitesModule } from './invites/invites.module.js';
import { TenantAdminModule } from './tenant-admin/tenant-admin.module.js';
import { DocumentsModule } from './documents/documents.module.js';
import { AttachmentsModule } from './attachments/attachments.module.js';
import { PasswordResetModule } from './password-reset/password-reset.module.js';
import { LlmModule } from './llm/llm.module.js';
import { MatchModule } from './match/match.module.js';
import { MatchAiModule } from './match-ai/match-ai.module.js';
import { ComplianceModule } from './compliance/compliance.module.js';
import { MailModule } from './mail/mail.module.js';
import { ArtifactsModule } from './artifacts/artifacts.module.js';
import { RetentionModule } from './retention/retention.module.js';
import { AccountModule } from './account/account.module.js';
import { AssistantModule } from './assistant/assistant.module.js';

/** Open liveness probe — the one API route with no guard and no service behind it. */
@Controller('api/v1')
export class HealthController {
  @Get('health')
  health() {
    return { status: 'ok' };
  }
}

/** Every feature slice of the API — shared with the acceptance-test harness. */
export const FEATURE_MODULES = [
  RegistriesModule,
  AiModule,
  ApplicationsModule,
  JobsModule,
  AtsModule,
  SearchesModule,
  MandatesModule,
  TalentsModule,
  TalentImportModule,
  PlacementsModule,
  CandidaciesModule,
  ObservationsModule,
  ForecastModule,
  UsageModule,
  MembersModule,
  InvitesModule,
  TenantAdminModule,
  DocumentsModule,
  AttachmentsModule,
  PasswordResetModule,
  LlmModule,
  MatchModule,
  MatchAiModule,
  ComplianceModule,
  MailModule,
  ArtifactsModule,
  RetentionModule,
  AccountModule,
  AssistantModule,
];

/**
 * The application root (ADR-0051): global composition (core, persistence, infra,
 * auth, DSGVO registries, AI services) plus every feature slice. This replaces
 * `container.ts` + `create-app.ts` — Nest owns construction and routing; the
 * hexagonal services stay decorator-free behind their injection tokens.
 */
@Module({
  imports: [CoreModule, PersistenceModule, InfraModule, AuthModule, ...FEATURE_MODULES],
  controllers: [HealthController],
})
export class AppModule {
  /** Production entry: pass the migrated Drizzle handle (or null for the fs store). */
  static forRoot(db: Db | null): DynamicModule {
    return { module: AppModule, imports: [PersistenceModule.forRoot(db)] };
  }
}
