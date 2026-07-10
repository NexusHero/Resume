import 'reflect-metadata';
import { Test } from '@nestjs/testing';
import {
  Global,
  Module,
  type CanActivate,
  type ExecutionContext,
  type INestApplication,
  type Provider,
} from '@nestjs/common';
import request from 'supertest';
import { CoreModule } from '../../src/nest/core.module.js';
import { RegistriesModule } from '../../src/nest/registries.module.js';
import { MatchModule } from '../../src/nest/match/match.module.js';
import { ArtifactsModule } from '../../src/nest/artifacts/artifacts.module.js';
import { RetentionModule } from '../../src/nest/retention/retention.module.js';
import { AccountModule } from '../../src/nest/account/account.module.js';
import { AssistantModule } from '../../src/nest/assistant/assistant.module.js';
import { AuthGuard } from '../../src/nest/auth.guard.js';
import { ProblemJsonFilter } from '../../src/nest/problem-json.filter.js';
import { RoleAuthorizer } from '../../src/adapters/role-authorizer.js';
import type { Plan } from '../../src/domain/plan.js';
import {
  AUTHORIZER,
  PLAN_PROVIDER,
  EMBEDDING_PROVIDER,
  JOB_SOURCE,
  DOCUMENT_AI_SERVICE,
  MANDATE_REPOSITORY,
  TALENT_REPOSITORY,
  DOCUMENT_REPOSITORY,
  CANDIDACY_REPOSITORY,
  PLACEMENT_REPOSITORY,
  APPLICATION_REPOSITORY,
  INTERVIEW_OBSERVATION_REPOSITORY,
  ARTIFACT_LOG_REPOSITORY,
  RETENTION_POLICY_STORE,
  ASSISTANT_SETTINGS_STORE,
  ASSISTANT_SUGGESTION_REPOSITORY,
  STAGE_TRANSITION_REPOSITORY,
  USER_REPOSITORY,
  ATTACHMENT_STORE,
  PDF_RENDERER,
  PDF_MERGER,
  API_KEY_STORE,
  AUTH_ENGINE,
  PASSWORD_RESET_TOKEN_STORE,
  EMAIL_VERIFICATION_TOKEN_STORE,
  USAGE_METER,
} from '../../src/nest/tokens.js';
import {
  InMemoryMandateRepository,
  InMemoryTalentRepository,
  InMemoryDocumentRepository,
  InMemoryCandidacyRepository,
  InMemoryPlacementRepository,
  InMemoryApplicationRepository,
  InMemoryInterviewObservationRepository,
  InMemoryArtifactLogRepository,
  InMemoryRetentionPolicyStore,
  InMemoryAssistantSettingsStore,
  InMemoryAssistantSuggestionRepository,
  InMemoryStageTransitionRepository,
  InMemoryUserRepository,
  InMemoryAttachmentStore,
  InMemoryApiKeyStore,
  InMemoryPasswordResetTokenStore,
  InMemoryEmailVerificationTokenStore,
  InMemoryUsageMeter,
  FakeAuthEngine,
  FakeJobSource,
  FakePdfRenderer,
  FakePdfMerger,
  noopLogger,
} from '../support/fakes.js';

// Mutable stamped principal — retention tests flip the roles per request.
const principal = { userId: 'user1', roles: ['admin'] as string[], tenantId: 'team' };

class StampGuard implements CanActivate {
  canActivate(ctx: ExecutionContext): boolean {
    Object.assign(ctx.switchToHttp().getRequest(), principal);
    return true;
  }
}

describe('NestJS ops verticals (match, artifacts, retention, account, assistant)', () => {
  let app: INestApplication;
  let plan: Plan = 'pro';
  const artifacts = new InMemoryArtifactLogRepository();
  const users = new InMemoryUserRepository();
  const mandates = new InMemoryMandateRepository();

  beforeAll(async () => {
    const fakes: Provider[] = [
      { provide: AUTHORIZER, useValue: new RoleAuthorizer() },
      { provide: PLAN_PROVIDER, useValue: { planFor: async () => plan } },
      { provide: EMBEDDING_PROVIDER, useValue: { embed: async () => [1, 0, 0] } },
      { provide: DOCUMENT_AI_SERVICE, useValue: {} },
      { provide: MANDATE_REPOSITORY, useValue: mandates },
      { provide: TALENT_REPOSITORY, useValue: new InMemoryTalentRepository() },
      { provide: DOCUMENT_REPOSITORY, useValue: new InMemoryDocumentRepository() },
      { provide: CANDIDACY_REPOSITORY, useValue: new InMemoryCandidacyRepository() },
      { provide: PLACEMENT_REPOSITORY, useValue: new InMemoryPlacementRepository() },
      { provide: APPLICATION_REPOSITORY, useValue: new InMemoryApplicationRepository() },
      {
        provide: INTERVIEW_OBSERVATION_REPOSITORY,
        useValue: new InMemoryInterviewObservationRepository(),
      },
      { provide: ARTIFACT_LOG_REPOSITORY, useValue: artifacts },
      { provide: RETENTION_POLICY_STORE, useValue: new InMemoryRetentionPolicyStore() },
      { provide: ASSISTANT_SETTINGS_STORE, useValue: new InMemoryAssistantSettingsStore() },
      {
        provide: ASSISTANT_SUGGESTION_REPOSITORY,
        useValue: new InMemoryAssistantSuggestionRepository(),
      },
      { provide: STAGE_TRANSITION_REPOSITORY, useValue: new InMemoryStageTransitionRepository() },
      { provide: USER_REPOSITORY, useValue: users },
      { provide: ATTACHMENT_STORE, useValue: new InMemoryAttachmentStore() },
      { provide: PDF_RENDERER, useValue: new FakePdfRenderer() },
      { provide: PDF_MERGER, useValue: new FakePdfMerger() },
      { provide: API_KEY_STORE, useValue: new InMemoryApiKeyStore() },
      { provide: AUTH_ENGINE, useValue: new FakeAuthEngine() },
      { provide: PASSWORD_RESET_TOKEN_STORE, useValue: new InMemoryPasswordResetTokenStore() },
      {
        provide: EMAIL_VERIFICATION_TOKEN_STORE,
        useValue: new InMemoryEmailVerificationTokenStore(),
      },
      { provide: USAGE_METER, useValue: new InMemoryUsageMeter() },
    ];
    @Global()
    @Module({ providers: fakes, exports: fakes.map((p) => (p as { provide: symbol }).provide) })
    class FakePortsModule {}

    const moduleRef = await Test.createTestingModule({
      imports: [
        CoreModule,
        FakePortsModule,
        RegistriesModule,
        MatchModule,
        ArtifactsModule,
        RetentionModule,
        AccountModule,
        AssistantModule,
      ],
    })
      .overrideGuard(AuthGuard)
      .useClass(StampGuard)
      // Replace JobsModule's own JOB_SOURCE (createJobSource → live boards).
      .overrideProvider(JOB_SOURCE)
      .useValue(new FakeJobSource())
      .compile();

    app = moduleRef.createNestApplication();
    app.useGlobalFilters(new ProblemJsonFilter(noopLogger));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    plan = 'pro';
    principal.roles = ['admin'];
  });

  it('Match_UnknownMandate_Returns404', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/mandates/nope/match')
      .send({ jobText: 'TypeScript' });
    expect(res.status).toBe(404);
  });

  it('Match_RanksThePoolForAMandate', async () => {
    await mandates.add({
      id: 'm1',
      ownerId: 'team',
      client: 'Aurora GmbH',
      role: 'Staff Engineer',
      location: 'Berlin',
      status: 'open',
      createdAt: '2026-01-01T00:00:00.000Z',
    } as never);
    const res = await request(app.getHttpServer())
      .post('/api/v1/mandates/m1/match')
      .send({ jobText: 'TypeScript' });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ matches: [] });
  });

  it('Artifacts_ListStatsOutcome_RoundTrip', async () => {
    const server = app.getHttpServer();
    await artifacts.add({
      id: 'a1',
      ownerId: 'team',
      kind: 'outreach',
      talentId: 't1',
      provider: 'template',
      channel: 'email',
      audience: 'candidate',
      outcome: 'pending',
      createdAt: '2026-01-02T00:00:00.000Z',
    } as never);

    const list = await request(server).get('/api/v1/artifacts?talentId=t1');
    expect(list.status).toBe(200);
    expect(list.body.map((a: { id: string }) => a.id)).toEqual(['a1']);

    const stamped = await request(server)
      .post('/api/v1/artifacts/a1/outcome')
      .send({ outcome: 'replied' });
    expect(stamped.status).toBe(200);
    expect(stamped.body.artifact.outcome).toBe('replied');

    const stats = await request(server).get('/api/v1/artifacts/stats');
    expect(stats.status).toBe(200);
    expect(stats.body).toHaveProperty('byKind');

    const missing = await request(server)
      .post('/api/v1/artifacts/nope/outcome')
      .send({ outcome: 'replied' });
    expect(missing.status).toBe(404);
  });

  it('Retention_PolicyRoundTrip_AsAdmin', async () => {
    const server = app.getHttpServer();
    const before = await request(server).get('/api/v1/retention/policy');
    expect(before.status).toBe(200);
    expect(before.body).toHaveProperty('reviewDays');

    const updated = await request(server).put('/api/v1/retention/policy').send({ reviewDays: 90 });
    expect(updated.status).toBe(200);
    expect(updated.body.reviewDays).toBe(90);

    const report = await request(server).get('/api/v1/retention/report?days=30');
    expect(report.status).toBe(200);
  });

  it('Retention_NonAdmin_Gets403', async () => {
    principal.roles = ['recruiter'];
    const res = await request(app.getHttpServer()).get('/api/v1/retention/policy');
    expect(res.status).toBe(403);
    expect(res.headers['content-type']).toMatch(/application\/problem\+json/);
  });

  it('Account_Export_IsADownloadWithTheCallerData', async () => {
    await users.add({
      id: 'user1',
      email: 'user1@example.com',
      passwordHash: 'x',
      createdAt: '2026-01-01T00:00:00.000Z',
    } as never);
    const res = await request(app.getHttpServer()).get('/api/v1/account/export');
    expect(res.status).toBe(200);
    expect(res.headers['content-disposition']).toContain('myjob-export.json');
    expect(res.body).toHaveProperty('exportedAt');
    expect(res.body).toHaveProperty('mandates');
    expect(res.body).toHaveProperty('applications');
  });

  it('Account_Delete_ErasesAndClearsTheSessionCookie', async () => {
    const res = await request(app.getHttpServer()).delete('/api/v1/account');
    expect(res.status).toBe(204);
    expect(String(res.headers['set-cookie'])).toContain('=;');
    expect(await users.findById('user1')).toBeNull();
  });

  it('Assistant_OverviewAndSettings_Work', async () => {
    const server = app.getHttpServer();
    const overview = await request(server).get('/api/v1/assistant');
    expect(overview.status).toBe(200);
    expect(overview.body.counts).toEqual({
      proposed: 0,
      accepted: 0,
      dismissed: 0,
      autoApplied: 0,
    });

    const updated = await request(server).put('/api/v1/assistant').send({ enabled: true });
    expect(updated.status).toBe(200);
    expect(updated.body.settings.enabled).toBe(true);
  });

  it('Assistant_AutopilotMode_IsProGated', async () => {
    plan = 'free';
    const denied = await request(app.getHttpServer())
      .put('/api/v1/assistant')
      .send({ mode: 'autopilot' });
    expect(denied.status).toBe(402);

    // Non-autopilot updates stay Free — the `when` predicate skips the gate.
    const ok = await request(app.getHttpServer())
      .put('/api/v1/assistant')
      .send({ mode: 'suggest' });
    expect(ok.status).toBe(200);
  });

  it('Assistant_RunWhileDisabled_Returns400', async () => {
    await request(app.getHttpServer()).put('/api/v1/assistant').send({ enabled: false });
    const res = await request(app.getHttpServer()).post('/api/v1/assistant/run');
    expect(res.status).toBe(400);
    expect(res.body.detail).toMatch(/switched off/);
  });
});
