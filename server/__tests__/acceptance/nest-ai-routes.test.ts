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
import { AiModule } from '../../src/nest/ai/ai.module.js';
import { MatchAiModule } from '../../src/nest/match-ai/match-ai.module.js';
import { ComplianceModule } from '../../src/nest/compliance/compliance.module.js';
import { MailModule } from '../../src/nest/mail/mail.module.js';
import { TalentImportModule } from '../../src/nest/talents/talent-import.module.js';
import { AuthGuard } from '../../src/nest/auth.guard.js';
import { ProblemJsonFilter } from '../../src/nest/problem-json.filter.js';
import type { Plan } from '../../src/domain/plan.js';
import {
  DOCUMENT_AI_SERVICE,
  PLAN_PROVIDER,
  MANDATE_REPOSITORY,
  TALENT_REPOSITORY,
  DOCUMENT_REPOSITORY,
  USER_REPOSITORY,
  ATTACHMENT_STORE,
  PDF_RENDERER,
  PDF_MERGER,
  TALENT_DATA_PURGERS,
  MAILER,
  INBOX_SOURCE,
  ARTIFACT_LOG_REPOSITORY,
  LLM_SERVICE,
  API_KEY_STORE,
  USAGE_METER,
  PDF_TEXT_EXTRACTOR,
  INTERVIEW_OBSERVATION_REPOSITORY,
  RATE_LIMITER,
} from '../../src/nest/tokens.js';
import { InMemoryRateLimiter } from '../../src/adapters/in-memory-rate-limiter.js';
import {
  InMemoryMandateRepository,
  InMemoryTalentRepository,
  InMemoryDocumentRepository,
  InMemoryUserRepository,
  InMemoryAttachmentStore,
  InMemoryArtifactLogRepository,
  InMemoryApiKeyStore,
  InMemoryUsageMeter,
  RecordingMailer,
  FakeInboxSource,
  FakePdfRenderer,
  FakePdfMerger,
  noopLogger,
} from '../support/fakes.js';

/** Stamps a team member so the guarded routes run without the full auth chain. */
class StampUserGuard implements CanActivate {
  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest();
    req.userId = 'user1';
    req.tenantId = 'team';
    return true;
  }
}

// The DocumentAi facade, scripted: the controllers under test only shuttle
// scope/user/talent + parsed body into it and wrap the result.
const aiStub = {
  suggest: async () => 'a sharper summary',
  parse: async () => ({ name: 'Ada' }),
  parsePdf: async () => ({ name: 'Ada' }),
  scoreAgainstJob: async () => ({ score: 82 }),
  pitchForMandate: async () => 'pitch',
  outreach: async () => 'hello there',
  translateDocuments: async () => ({ translated: true }),
  explainMatch: async () => 'strong overlap on required skills',
  interviewKit: async () => ({ questions: [] }),
  candidatePrep: async () => ({ topics: [] }),
};

describe('NestJS AI-backed verticals (match-ai, compliance, mail, documents-AI, import)', () => {
  let app: INestApplication;
  let plan: Plan = 'pro';
  const mandates = new InMemoryMandateRepository();

  beforeAll(async () => {
    const fakes: Provider[] = [
      { provide: PLAN_PROVIDER, useValue: { planFor: async () => plan } },
      { provide: MANDATE_REPOSITORY, useValue: mandates },
      { provide: TALENT_REPOSITORY, useValue: new InMemoryTalentRepository() },
      { provide: DOCUMENT_REPOSITORY, useValue: new InMemoryDocumentRepository() },
      { provide: USER_REPOSITORY, useValue: new InMemoryUserRepository() },
      { provide: ATTACHMENT_STORE, useValue: new InMemoryAttachmentStore() },
      { provide: PDF_RENDERER, useValue: new FakePdfRenderer() },
      { provide: PDF_MERGER, useValue: new FakePdfMerger() },
      { provide: TALENT_DATA_PURGERS, useValue: [] },
      { provide: MAILER, useValue: new RecordingMailer() },
      { provide: INBOX_SOURCE, useValue: new FakeInboxSource() },
      { provide: ARTIFACT_LOG_REPOSITORY, useValue: new InMemoryArtifactLogRepository() },
      { provide: LLM_SERVICE, useValue: {} },
      { provide: API_KEY_STORE, useValue: new InMemoryApiKeyStore() },
      { provide: USAGE_METER, useValue: new InMemoryUsageMeter() },
      { provide: PDF_TEXT_EXTRACTOR, useValue: {} },
      { provide: INTERVIEW_OBSERVATION_REPOSITORY, useValue: {} },
      { provide: RATE_LIMITER, useValue: new InMemoryRateLimiter() },
    ];
    @Global()
    @Module({ providers: fakes, exports: fakes.map((p) => (p as { provide: symbol }).provide) })
    class FakePortsModule {}

    const moduleRef = await Test.createTestingModule({
      imports: [
        CoreModule,
        FakePortsModule,
        AiModule,
        MatchAiModule,
        ComplianceModule,
        MailModule,
        TalentImportModule,
      ],
    })
      .overrideGuard(AuthGuard)
      .useClass(StampUserGuard)
      .overrideProvider(DOCUMENT_AI_SERVICE)
      .useValue(aiStub)
      .compile();

    app = moduleRef.createNestApplication();
    app.useGlobalFilters(new ProblemJsonFilter(noopLogger));
    await app.init();

    await mandates.add({
      id: 'm1',
      ownerId: 'team',
      client: 'Aurora GmbH',
      role: 'Staff Engineer',
      location: 'Berlin',
      status: 'open',
      createdAt: '2026-01-01T00:00:00.000Z',
    } as never);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    plan = 'pro';
  });

  it('MatchAi_Explain_UsesTheMandateContext', async () => {
    const res = await request(app.getHttpServer()).post(
      '/api/v1/mandates/m1/candidates/t1/explain',
    );
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ explanation: 'strong overlap on required skills' });
  });

  it('MatchAi_UnknownMandate_Returns404', async () => {
    const res = await request(app.getHttpServer()).post('/api/v1/mandates/nope/candidates/t1/prep');
    expect(res.status).toBe(404);
    expect(res.headers['content-type']).toMatch(/application\/problem\+json/);
  });

  it('MatchAi_InterviewKitAndPrep_Return200', async () => {
    const kit = await request(app.getHttpServer()).post(
      '/api/v1/mandates/m1/candidates/t1/interview-kit',
    );
    expect(kit.status).toBe(200);
    expect(kit.body).toEqual({ kit: { questions: [] } });
    const prep = await request(app.getHttpServer()).post('/api/v1/mandates/m1/candidates/t1/prep');
    expect(prep.status).toBe(200);
    expect(prep.body).toEqual({ prep: { topics: [] } });
  });

  it('Compliance_AggCheck_IsFreeAndDeterministic', async () => {
    plan = 'free';
    const res = await request(app.getHttpServer())
      .post('/api/v1/compliance/agg-check')
      .send({ text: 'Junger Bewerber gesucht' });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('findings');
  });

  it('Compliance_AggRewrite_IsProGated', async () => {
    plan = 'free';
    const denied = await request(app.getHttpServer())
      .post('/api/v1/compliance/agg-rewrite')
      .send({ text: 'Junger Bewerber gesucht' });
    expect(denied.status).toBe(402);

    plan = 'pro';
    const ok = await request(app.getHttpServer())
      .post('/api/v1/compliance/agg-rewrite')
      .send({ text: 'Junger Bewerber gesucht' });
    expect(ok.status).toBe(200);
  });

  it('DocumentsAi_Suggest_Returns200AndIsProGated', async () => {
    const ok = await request(app.getHttpServer())
      .post('/api/v1/talents/t1/documents/ai')
      .send({ action: 'summary' });
    expect(ok.status).toBe(200);
    expect(ok.body).toEqual({ suggestion: 'a sharper summary' });

    plan = 'free';
    const denied = await request(app.getHttpServer())
      .post('/api/v1/talents/t1/documents/ai')
      .send({ action: 'summary' });
    expect(denied.status).toBe(402);
  });

  it('DocumentsAi_RemainingRoutes_ShuttleThroughTheFacade', async () => {
    const server = app.getHttpServer();
    const parse = await request(server)
      .post('/api/v1/talents/t1/documents/parse')
      .send({ text: 'CV text' });
    expect(parse.status).toBe(200);
    expect(parse.body).toEqual({ parsed: { name: 'Ada' } });

    const pdf = await request(server)
      .post('/api/v1/talents/t1/documents/parse-pdf')
      .send({ dataBase64: Buffer.from('%PDF').toString('base64') });
    expect(pdf.status).toBe(200);

    const ats = await request(server)
      .post('/api/v1/talents/t1/documents/ats')
      .send({ jobText: 'Wir suchen …' });
    expect(ats.status).toBe(200);
    expect(ats.body).toEqual({ ats: { score: 82 } });

    const outreach = await request(server).post('/api/v1/talents/t1/documents/outreach').send({});
    expect(outreach.status).toBe(200);
    expect(outreach.body).toEqual({ message: 'hello there' });

    const translate = await request(server)
      .post('/api/v1/talents/t1/documents/translate')
      .send({ targetLang: 'en' });
    expect(translate.status).toBe(200);
    expect(translate.body).toEqual({ translated: true });
  });

  it('Mail_StatusAndSyncReplies_Work', async () => {
    const status = await request(app.getHttpServer()).get('/api/v1/mail/status');
    expect(status.status).toBe(200);
    expect(status.body).toHaveProperty('sendTransport');
    expect(status.body).toHaveProperty('replySync');

    // No IMAP mailbox is configured in tests, so the on-demand sync explains that.
    const sync = await request(app.getHttpServer()).post('/api/v1/mail/sync-replies');
    expect(sync.status).toBe(400);
    expect(sync.body.detail).toMatch(/IMAP/);
  });

  it('TalentImport_IsProGated', async () => {
    plan = 'free';
    const denied = await request(app.getHttpServer())
      .post('/api/v1/talents/import')
      .send({ files: [] });
    expect(denied.status).toBe(402);
    expect(denied.body.type).toBe('about:blank#plan-required');
  });
});
