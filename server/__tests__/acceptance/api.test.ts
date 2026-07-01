import request from 'supertest';
import type { Express } from 'express';
import { loadConfig } from '../../src/config';
import { createApp } from '../../src/http/create-app';
import { ApplicationController } from '../../src/http/application-controller';
import { JobController } from '../../src/http/job-controller';
import { AtsController } from '../../src/http/ats-controller';
import { SavedSearchController } from '../../src/http/saved-search-controller';
import { ApplicationService } from '../../src/services/application-service';
import { JobSearchService } from '../../src/services/job-search-service';
import { AtsService } from '../../src/services/ats-service';
import { SavedSearchService } from '../../src/services/saved-search-service';
import { LlmController } from '../../src/http/llm-controller';
import { MandateController } from '../../src/http/mandate-controller';
import { TalentController } from '../../src/http/talent-controller';
import { PlacementController } from '../../src/http/placement-controller';
import { DocumentController } from '../../src/http/document-controller';
import { AuthController } from '../../src/http/auth-controller';
import { AccountController } from '../../src/http/account-controller';
import { PasswordResetController } from '../../src/http/password-reset-controller';
import { LlmService } from '../../src/services/llm-service';
import { MandateService } from '../../src/services/mandate-service';
import { TalentService } from '../../src/services/talent-service';
import { PlacementService } from '../../src/services/placement-service';
import { DocumentService } from '../../src/services/document-service';
import { DocumentAiService } from '../../src/services/document-ai-service';
import { AuthService } from '../../src/services/auth-service';
import { AccountService } from '../../src/services/account-service';
import { PasswordResetService } from '../../src/services/password-reset-service';
import { MemorySessionStore } from '../../src/adapters/memory-session-store';
import { CoverLetterService } from '../../src/services/cover-letter-service';
import { AnthropicLlmProvider } from '../../src/adapters/anthropic-llm-provider';
import { GeminiLlmProvider } from '../../src/adapters/gemini-llm-provider';
import { nodeFetch } from '../../src/adapters/node-fetch';
import { SampleJobSource } from '../../src/adapters/sample-job-source';
import { KeywordSkillExtractor } from '../../src/adapters/keyword-skill-extractor';
import {
  InMemoryApplicationRepository,
  InMemoryAuditLog,
  InMemoryPdfArchive,
  InMemorySavedSearchRepository,
  InMemoryMandateRepository,
  InMemoryTalentRepository,
  InMemoryPlacementRepository,
  InMemoryDocumentRepository,
  InMemoryUserRepository,
  InMemoryApiKeyStore,
  InMemoryPasswordResetTokenStore,
  RecordingMailer,
  fakePasswordHasher,
  FakePdfRenderer,
  FakePdfMerger,
  FakeVersioner,
  FixedClock,
  SequenceIdGenerator,
  noopLogger,
} from '../support/fakes';

function makeApp(
  config = loadConfig({}),
  opts: {
    mailer?: RecordingMailer;
    passwordResetTokenStore?: InMemoryPasswordResetTokenStore;
  } = {},
): Express {
  const service = new ApplicationService({
    applicationRepository: new InMemoryApplicationRepository(),
    auditLog: new InMemoryAuditLog(),
    pdfArchive: new InMemoryPdfArchive(),
    pdfRenderer: new FakePdfRenderer(),
    pdfMerger: new FakePdfMerger(),
    versioner: new FakeVersioner(null),
    clock: new FixedClock(),
    idGenerator: new SequenceIdGenerator(),
    logger: noopLogger,
  });
  const controller = new ApplicationController({ applicationService: service });
  const jobSearchService = new JobSearchService({
    jobSource: new SampleJobSource(),
    skillExtractor: new KeywordSkillExtractor(),
    candidateProfile: config.candidateProfile,
    logger: noopLogger,
  });
  const jobController = new JobController({ jobSearchService, config });
  const atsController = new AtsController({
    atsService: new AtsService({
      skillExtractor: new KeywordSkillExtractor(),
      candidateProfile: config.candidateProfile,
    }),
  });
  const savedSearchController = new SavedSearchController({
    savedSearchService: new SavedSearchService({
      savedSearchRepository: new InMemorySavedSearchRepository(),
      jobSearchService,
      clock: new FixedClock(),
      idGenerator: new SequenceIdGenerator('search'),
    }),
  });
  const llmService = new LlmService({
    providers: [
      new AnthropicLlmProvider({ httpFetch: nodeFetch, config: config.llm.anthropic }),
      new GeminiLlmProvider({ httpFetch: nodeFetch, config: config.llm.gemini }),
    ],
    defaultProvider: config.llm.provider,
    logger: noopLogger,
  });
  const llmController = new LlmController({
    llmService,
    coverLetterService: new CoverLetterService({
      llmService,
      candidate: config.candidate,
      logger: noopLogger,
    }),
    apiKeyStore: new InMemoryApiKeyStore(),
  });
  // Shared repositories so the account (DSGVO) endpoints observe the same data
  // the recruiting endpoints write, and erasure affects the same auth state.
  const mandateRepository = new InMemoryMandateRepository();
  const talentRepository = new InMemoryTalentRepository();
  const placementRepository = new InMemoryPlacementRepository();
  const documentRepository = new InMemoryDocumentRepository();
  const userRepository = new InMemoryUserRepository();
  const sessionStore = new MemorySessionStore();
  const passwordResetTokenStore =
    opts.passwordResetTokenStore ?? new InMemoryPasswordResetTokenStore();
  const mailer = opts.mailer ?? new RecordingMailer();
  const mandateController = new MandateController({
    mandateService: new MandateService({
      mandateRepository,
      clock: new FixedClock(),
      idGenerator: new SequenceIdGenerator('mandate'),
    }),
  });
  const talentController = new TalentController({
    talentService: new TalentService({
      talentRepository,
      documentRepository,
      clock: new FixedClock(),
      idGenerator: new SequenceIdGenerator('talent'),
    }),
  });
  const documentService = new DocumentService({
    documentRepository,
    talentRepository,
    pdfRenderer: new FakePdfRenderer(),
    clock: new FixedClock(),
  });
  const documentController = new DocumentController({
    documentService,
    documentAiService: new DocumentAiService({
      documentService,
      llmService,
      apiKeyStore: new InMemoryApiKeyStore(),
      logger: noopLogger,
    }),
  });
  const placementController = new PlacementController({
    placementService: new PlacementService({
      placementRepository,
      clock: new FixedClock(),
      idGenerator: new SequenceIdGenerator('placement'),
    }),
  });
  const authController = new AuthController({
    authService: new AuthService({
      userRepository,
      sessionStore,
      passwordHasher: fakePasswordHasher,
      clock: new FixedClock(),
      idGenerator: new SequenceIdGenerator('user'),
    }),
    config,
  });
  const accountController = new AccountController({
    accountService: new AccountService({
      userRepository,
      mandateRepository,
      talentRepository,
      placementRepository,
      documentRepository,
      sessionStore,
      passwordResetTokenStore,
    }),
    clock: new FixedClock(),
    config,
  });
  const passwordResetController = new PasswordResetController({
    passwordResetService: new PasswordResetService({
      userRepository,
      sessionStore,
      passwordResetTokenStore,
      passwordHasher: fakePasswordHasher,
      mailer,
      logger: noopLogger,
      config,
    }),
  });
  return createApp({
    applicationController: controller,
    jobController,
    atsController,
    savedSearchController,
    llmController,
    mandateController,
    talentController,
    placementController,
    documentController,
    authController,
    accountController,
    passwordResetController,
    config,
    logger: noopLogger,
  });
}

describe('REST API /api/v1', () => {
  let app: Express;
  beforeEach(() => {
    app = makeApp();
  });

  it('Health_Get_ReturnsOk', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });

  it('Applications_GetEmpty_ReturnsArray', async () => {
    const res = await request(app).get('/api/v1/applications');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('Applications_PostValid_Creates201', async () => {
    const res = await request(app)
      .post('/api/v1/applications')
      .send({ company: 'Aurora', position: 'Engineer' });
    expect(res.status).toBe(201);
    expect(res.body.application).toMatchObject({
      id: 'id1',
      company: 'Aurora',
      position: 'Engineer',
    });

    const list = await request(app).post('/api/v1/applications').send({ company: 'Second' });
    expect(list.status).toBe(201);
  });

  it('Applications_PostMissingCompany_Returns400Problem', async () => {
    const res = await request(app).post('/api/v1/applications').send({ position: 'x' });
    expect(res.status).toBe(400);
    expect(res.headers['content-type']).toMatch(/application\/problem\+json/);
    expect(res.body).toMatchObject({ title: 'Validation failed', status: 400 });
  });

  it('Applications_PatchExisting_Updates', async () => {
    const created = await request(app).post('/api/v1/applications').send({ company: 'Aurora' });
    const id = created.body.application.id;
    const res = await request(app)
      .patch(`/api/v1/applications/${id}`)
      .send({ status: 'interview' });
    expect(res.status).toBe(200);
    expect(res.body.application.status).toBe('interview');
  });

  it('Applications_PatchUnknown_Returns404Problem', async () => {
    const res = await request(app).patch('/api/v1/applications/nope').send({ status: 'hired' });
    expect(res.status).toBe(404);
    expect(res.body).toMatchObject({ status: 404, title: 'NotFoundError' });
  });

  it('Build_Post_Returns201WithPdf', async () => {
    const res = await request(app)
      .post('/api/v1/applications/build')
      .send({ company: 'Aurora', language: 'en' });
    expect(res.status).toBe(201);
    expect(res.body.application.company).toBe('Aurora');
    expect(typeof res.body.pdfBase64).toBe('string');
  });

  it('History_Get_ReturnsArray', async () => {
    await request(app).post('/api/v1/applications').send({ company: 'Aurora' });
    const res = await request(app).get('/api/v1/history');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });

  it('Api_UnknownRoute_Returns404Problem', async () => {
    const res = await request(app).get('/api/v1/nope');
    expect(res.status).toBe(404);
    expect(res.body).toMatchObject({ title: 'Not Found' });
  });

  // Recruiting endpoints are owner-scoped: every request runs under an
  // authenticated session, so each test drives a logged-in supertest agent.
  describe('Recruiting (owner-scoped)', () => {
    let agent: ReturnType<typeof request.agent>;
    beforeEach(async () => {
      agent = request.agent(app);
      await agent
        .post('/api/v1/auth/register')
        .send({ email: 'recruiter@example.com', password: 'correct horse battery' });
    });

    it('Mandates_Unauthenticated_Returns401', async () => {
      const res = await request(app).get('/api/v1/mandates');
      expect(res.status).toBe(401);
      expect(res.body).toMatchObject({ status: 401 });
    });

    it('Mandates_GetEmpty_ReturnsArray', async () => {
      const res = await agent.get('/api/v1/mandates');
      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    it('Mandates_PostValid_Creates201', async () => {
      const res = await agent
        .post('/api/v1/mandates')
        .send({ client: 'Aurora', role: 'C++ Engineer', location: 'Berlin' });
      expect(res.status).toBe(201);
      expect(res.body.mandate).toMatchObject({
        id: 'mandate1',
        client: 'Aurora',
        role: 'C++ Engineer',
        priority: 'medium',
        status: 'active',
      });
    });

    it('Mandates_PostMissingClient_Returns400Problem', async () => {
      const res = await agent
        .post('/api/v1/mandates')
        .send({ role: 'C++ Engineer', location: 'Berlin' });
      expect(res.status).toBe(400);
      expect(res.headers['content-type']).toMatch(/application\/problem\+json/);
      expect(res.body).toMatchObject({ title: 'Validation failed', status: 400 });
    });

    it('Mandates_PatchExisting_Updates', async () => {
      const created = await agent
        .post('/api/v1/mandates')
        .send({ client: 'Aurora', role: 'C++ Engineer', location: 'Berlin' });
      const id = created.body.mandate.id;
      const res = await agent.patch(`/api/v1/mandates/${id}`).send({ status: 'paused' });
      expect(res.status).toBe(200);
      expect(res.body.mandate.status).toBe('paused');
    });

    it('Mandates_PatchUnknown_Returns404Problem', async () => {
      const res = await agent.patch('/api/v1/mandates/nope').send({ status: 'closed' });
      expect(res.status).toBe(404);
      expect(res.body).toMatchObject({ status: 404, title: 'NotFoundError' });
    });

    it('Mandates_DeleteExisting_Returns204', async () => {
      const created = await agent
        .post('/api/v1/mandates')
        .send({ client: 'Aurora', role: 'C++ Engineer', location: 'Berlin' });
      const id = created.body.mandate.id;
      const res = await agent.delete(`/api/v1/mandates/${id}`);
      expect(res.status).toBe(204);
      const list = await agent.get('/api/v1/mandates');
      expect(list.body).toEqual([]);
    });

    it('Mandates_DeleteUnknown_Returns404Problem', async () => {
      const res = await agent.delete('/api/v1/mandates/nope');
      expect(res.status).toBe(404);
      expect(res.body).toMatchObject({ status: 404 });
    });

    it('Mandates_AnotherOwner_CannotSeeOrMutate', async () => {
      const created = await agent
        .post('/api/v1/mandates')
        .send({ client: 'Aurora', role: 'C++ Engineer', location: 'Berlin' });
      const id = created.body.mandate.id;

      const intruder = request.agent(app);
      await intruder
        .post('/api/v1/auth/register')
        .send({ email: 'intruder@example.com', password: 'another good passphrase' });

      // The intruder sees an empty list and cannot reach the other owner's row.
      expect((await intruder.get('/api/v1/mandates')).body).toEqual([]);
      expect(
        (await intruder.patch(`/api/v1/mandates/${id}`).send({ status: 'paused' })).status,
      ).toBe(404);
      expect((await intruder.delete(`/api/v1/mandates/${id}`)).status).toBe(404);
      // The owner's row is untouched.
      expect((await agent.get('/api/v1/mandates')).body).toHaveLength(1);
    });

    it('Talents_GetEmpty_ReturnsArray', async () => {
      const res = await agent.get('/api/v1/talents');
      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    it('Talents_PostValid_Creates201', async () => {
      const res = await agent
        .post('/api/v1/talents')
        .send({ name: 'Lena Brandt', role: 'Product Designer', skills: ['Figma'] });
      expect(res.status).toBe(201);
      expect(res.body.talent).toMatchObject({
        id: 'talent1',
        name: 'Lena Brandt',
        role: 'Product Designer',
        skills: ['Figma'],
      });
    });

    it('Talents_PostMissingName_Returns400Problem', async () => {
      const res = await agent.post('/api/v1/talents').send({ role: 'Designer' });
      expect(res.status).toBe(400);
      expect(res.headers['content-type']).toMatch(/application\/problem\+json/);
      expect(res.body).toMatchObject({ title: 'Validation failed', status: 400 });
    });

    it('Talents_PatchExisting_Updates', async () => {
      const created = await agent.post('/api/v1/talents').send({ name: 'Lena Brandt' });
      const id = created.body.talent.id;
      const res = await agent.patch(`/api/v1/talents/${id}`).send({ availability: 'immediately' });
      expect(res.status).toBe(200);
      expect(res.body.talent.availability).toBe('immediately');
    });

    it('Talents_PatchUnknown_Returns404Problem', async () => {
      const res = await agent.patch('/api/v1/talents/nope').send({ role: 'x' });
      expect(res.status).toBe(404);
      expect(res.body).toMatchObject({ status: 404, title: 'NotFoundError' });
    });

    it('Talents_DeleteExisting_Returns204', async () => {
      const created = await agent.post('/api/v1/talents').send({ name: 'Lena Brandt' });
      const id = created.body.talent.id;
      const res = await agent.delete(`/api/v1/talents/${id}`);
      expect(res.status).toBe(204);
      const list = await agent.get('/api/v1/talents');
      expect(list.body).toEqual([]);
    });

    it('Talents_DeleteUnknown_Returns404Problem', async () => {
      const res = await agent.delete('/api/v1/talents/nope');
      expect(res.status).toBe(404);
      expect(res.body).toMatchObject({ status: 404 });
    });

    it('Documents_Unauthenticated_Returns401', async () => {
      const res = await request(app).get('/api/v1/talents/whatever/documents');
      expect(res.status).toBe(401);
    });

    it('Documents_UnknownTalent_Returns404', async () => {
      const res = await agent.get('/api/v1/talents/missing/documents');
      expect(res.status).toBe(404);
      expect(res.body).toMatchObject({ status: 404 });
    });

    it('Documents_GetBeforeSave_SeedsContactFromTalent', async () => {
      const created = await agent
        .post('/api/v1/talents')
        .send({ name: 'Lena Brandt', email: 'lena@x.de' });
      const id = created.body.talent.id as string;
      const res = await agent.get(`/api/v1/talents/${id}/documents`);
      expect(res.status).toBe(200);
      expect(res.body.documents.contact).toMatchObject({ name: 'Lena Brandt', email: 'lena@x.de' });
      expect(res.body.documents.resume.experience).toEqual([]);
    });

    it('Documents_PutThenGet_RoundTrips', async () => {
      const created = await agent.post('/api/v1/talents').send({ name: 'Lena Brandt' });
      const id = created.body.talent.id as string;
      const put = await agent.put(`/api/v1/talents/${id}/documents`).send({
        resume: { summary: 'Great designer.' },
        letter: { betreff: 'Bewerbung als Designerin', absaetze: ['Absatz.'] },
        style: { accent: '#1F8A5B' },
      });
      expect(put.status).toBe(200);
      expect(put.body.documents.resume.summary).toBe('Great designer.');

      const get = await agent.get(`/api/v1/talents/${id}/documents`);
      expect(get.body.documents.letter.absaetze).toEqual(['Absatz.']);
      expect(get.body.documents.style.accent).toBe('#1F8A5B');
    });

    it('Documents_DeletedTalent_GetReturns404', async () => {
      const created = await agent.post('/api/v1/talents').send({ name: 'Lena Brandt' });
      const id = created.body.talent.id as string;
      await agent.put(`/api/v1/talents/${id}/documents`).send({ resume: { summary: 'x' } });
      await agent.delete(`/api/v1/talents/${id}`);
      const res = await agent.get(`/api/v1/talents/${id}/documents`);
      expect(res.status).toBe(404);
    });

    it('DocumentsPdf_Get_ReturnsPdf', async () => {
      const created = await agent.post('/api/v1/talents').send({ name: 'Lena Brandt' });
      const id = created.body.talent.id as string;
      const res = await agent.get(`/api/v1/talents/${id}/documents/pdf`);
      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toMatch(/application\/pdf/);
    });

    it('DocumentsPdf_Unauthenticated_Returns401', async () => {
      const res = await request(app).get('/api/v1/talents/x/documents/pdf');
      expect(res.status).toBe(401);
    });

    it('DocumentsPdf_UnknownTalent_Returns404', async () => {
      const res = await agent.get('/api/v1/talents/missing/documents/pdf');
      expect(res.status).toBe(404);
    });

    it('DocumentsAi_Summary_ReturnsSuggestion', async () => {
      const created = await agent
        .post('/api/v1/talents')
        .send({ name: 'Lena Brandt', role: 'Designer' });
      const id = created.body.talent.id as string;
      // No LLM key configured in tests → deterministic template fallback.
      const res = await agent
        .post(`/api/v1/talents/${id}/documents/ai`)
        .send({ action: 'summary' });
      expect(res.status).toBe(200);
      expect(res.body.suggestion.provider).toBe('template');
      expect(typeof res.body.suggestion.text).toBe('string');
    });

    it('DocumentsAi_Letter_ReturnsParagraphs', async () => {
      const created = await agent.post('/api/v1/talents').send({ name: 'Lena Brandt' });
      const id = created.body.talent.id as string;
      const res = await agent
        .post(`/api/v1/talents/${id}/documents/ai`)
        .send({ action: 'letter', role: 'Lead Designer', company: 'Helio' });
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.suggestion.paragraphs)).toBe(true);
    });

    it('DocumentsAi_BadAction_Returns400', async () => {
      const created = await agent.post('/api/v1/talents').send({ name: 'Lena Brandt' });
      const id = created.body.talent.id as string;
      const res = await agent.post(`/api/v1/talents/${id}/documents/ai`).send({ action: 'nope' });
      expect(res.status).toBe(400);
    });

    it('DocumentsAi_Unauthenticated_Returns401', async () => {
      const res = await request(app)
        .post('/api/v1/talents/x/documents/ai')
        .send({ action: 'summary' });
      expect(res.status).toBe(401);
    });

    it('Placements_GetEmpty_ReturnsArray', async () => {
      const res = await agent.get('/api/v1/placements');
      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    it('Placements_PostValid_Creates201', async () => {
      const res = await agent
        .post('/api/v1/placements')
        .send({ candidateName: 'Mara Vogel', client: 'Aurora', fee: '19.000 €' });
      expect(res.status).toBe(201);
      expect(res.body.placement).toMatchObject({
        id: 'placement1',
        candidateName: 'Mara Vogel',
        client: 'Aurora',
        status: 'probation',
      });
    });

    it('Placements_PostMissingClient_Returns400Problem', async () => {
      const res = await agent.post('/api/v1/placements').send({ candidateName: 'Mara' });
      expect(res.status).toBe(400);
      expect(res.headers['content-type']).toMatch(/application\/problem\+json/);
      expect(res.body).toMatchObject({ title: 'Validation failed', status: 400 });
    });

    it('Placements_PatchExisting_Updates', async () => {
      const created = await agent
        .post('/api/v1/placements')
        .send({ candidateName: 'Mara Vogel', client: 'Aurora' });
      const id = created.body.placement.id;
      const res = await agent.patch(`/api/v1/placements/${id}`).send({ status: 'paid' });
      expect(res.status).toBe(200);
      expect(res.body.placement.status).toBe('paid');
    });

    it('Placements_PatchUnknown_Returns404Problem', async () => {
      const res = await agent.patch('/api/v1/placements/nope').send({ status: 'paid' });
      expect(res.status).toBe(404);
      expect(res.body).toMatchObject({ status: 404, title: 'NotFoundError' });
    });

    it('Placements_DeleteExisting_Returns204', async () => {
      const created = await agent
        .post('/api/v1/placements')
        .send({ candidateName: 'Mara Vogel', client: 'Aurora' });
      const id = created.body.placement.id;
      const res = await agent.delete(`/api/v1/placements/${id}`);
      expect(res.status).toBe(204);
      const list = await agent.get('/api/v1/placements');
      expect(list.body).toEqual([]);
    });

    it('Placements_DeleteUnknown_Returns404Problem', async () => {
      const res = await agent.delete('/api/v1/placements/nope');
      expect(res.status).toBe(404);
      expect(res.body).toMatchObject({ status: 404 });
    });

    it('AccountExport_Unauthenticated_Returns401', async () => {
      const res = await request(app).get('/api/v1/account/export');
      expect(res.status).toBe(401);
    });

    it('AccountExport_ReturnsOwnedDataAsDownload', async () => {
      await agent
        .post('/api/v1/mandates')
        .send({ client: 'Aurora', role: 'C++', location: 'Berlin' });
      await agent.post('/api/v1/talents').send({ name: 'Lena Brandt' });
      await agent
        .post('/api/v1/placements')
        .send({ candidateName: 'Mara Vogel', client: 'Aurora' });
      const res = await agent.get('/api/v1/account/export');
      expect(res.status).toBe(200);
      expect(res.headers['content-disposition']).toMatch(/myjob-export\.json/);
      expect(res.body.account).toMatchObject({ email: 'recruiter@example.com' });
      expect(res.body.mandates).toHaveLength(1);
      expect(res.body.talents).toHaveLength(1);
      expect(res.body.placements).toHaveLength(1);
      expect(typeof res.body.exportedAt).toBe('string');
    });

    it('AccountDelete_ErasesDataAndEndsSession', async () => {
      await agent
        .post('/api/v1/mandates')
        .send({ client: 'Aurora', role: 'C++', location: 'Berlin' });
      const del = await agent.delete('/api/v1/account');
      expect(del.status).toBe(204);
      // the session is gone — /auth/me now reports no user
      expect((await agent.get('/api/v1/auth/me')).body).toEqual({ user: null });
      // and a fresh recruiter with the same email starts with no inherited data
      const reborn = request.agent(app);
      await reborn
        .post('/api/v1/auth/register')
        .send({ email: 'recruiter@example.com', password: 'correct horse battery' });
      expect((await reborn.get('/api/v1/mandates')).body).toEqual([]);
    });
  });

  it('Auth_RegisterThenMe_ReturnsUserAndSetsCookie', async () => {
    const agent = request.agent(app);
    const reg = await agent
      .post('/api/v1/auth/register')
      .send({ email: 'a@example.com', password: 'supersecret' });
    expect(reg.status).toBe(201);
    expect(reg.body.user).toMatchObject({ id: 'user1', email: 'a@example.com' });
    expect(reg.headers['set-cookie']).toBeDefined();
    const me = await agent.get('/api/v1/auth/me');
    expect(me.body.user).toMatchObject({ email: 'a@example.com' });
  });

  it('Auth_MeWithoutSession_ReturnsNull', async () => {
    const res = await request(app).get('/api/v1/auth/me');
    expect(res.status).toBe(200);
    expect(res.body.user).toBeNull();
  });

  it('Auth_RegisterShortPassword_Returns400', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ email: 'd@example.com', password: 'short' });
    expect(res.status).toBe(400);
  });

  it('Auth_RegisterDuplicate_Returns409', async () => {
    await request(app)
      .post('/api/v1/auth/register')
      .send({ email: 'dup@example.com', password: 'supersecret' });
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ email: 'dup@example.com', password: 'supersecret' });
    expect(res.status).toBe(409);
  });

  it('Auth_LoginValid_ReturnsUserAndSession', async () => {
    await request(app)
      .post('/api/v1/auth/register')
      .send({ email: 'e@example.com', password: 'supersecret' });
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'e@example.com', password: 'supersecret' });
    expect(res.status).toBe(200);
    expect(res.body.user).toMatchObject({ email: 'e@example.com' });
    expect(res.headers['set-cookie']).toBeDefined();
  });

  it('Auth_LoginWrongPassword_Returns401', async () => {
    await request(app)
      .post('/api/v1/auth/register')
      .send({ email: 'b@example.com', password: 'supersecret' });
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'b@example.com', password: 'wrongpass' });
    expect(res.status).toBe(401);
  });

  it('Auth_LoginThenLogout_ClearsSession', async () => {
    const agent = request.agent(app);
    await agent
      .post('/api/v1/auth/register')
      .send({ email: 'c@example.com', password: 'supersecret' });
    const out = await agent.post('/api/v1/auth/logout');
    expect(out.status).toBe(204);
    const me = await agent.get('/api/v1/auth/me');
    expect(me.body.user).toBeNull();
  });

  it('Auth_Providers_ReturnsAvailabilityFlags', async () => {
    const res = await request(app).get('/api/v1/auth/providers');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ google: false, linkedin: false });
  });

  it('PasswordReset_FullFlow_EmailsLinkThenSetsNewPassword', async () => {
    const mailer = new RecordingMailer();
    const tokens = new InMemoryPasswordResetTokenStore();
    const resetApp = makeApp(loadConfig({}), { mailer, passwordResetTokenStore: tokens });
    await request(resetApp)
      .post('/api/v1/auth/register')
      .send({ email: 'reset@example.com', password: 'old-password' });

    const req = await request(resetApp)
      .post('/api/v1/auth/password-reset/request')
      .send({ email: 'reset@example.com' });
    expect(req.status).toBe(202);
    expect(mailer.sent).toHaveLength(1);
    const token = tokens.tokens[0]!.token;

    const confirm = await request(resetApp)
      .post('/api/v1/auth/password-reset/confirm')
      .send({ token, password: 'new-password' });
    expect(confirm.status).toBe(204);

    // old password no longer works, new one does
    const oldLogin = await request(resetApp)
      .post('/api/v1/auth/login')
      .send({ email: 'reset@example.com', password: 'old-password' });
    expect(oldLogin.status).toBe(401);
    const newLogin = await request(resetApp)
      .post('/api/v1/auth/login')
      .send({ email: 'reset@example.com', password: 'new-password' });
    expect(newLogin.status).toBe(200);
  });

  it('PasswordReset_UnknownEmail_Returns202_NoEmail', async () => {
    const mailer = new RecordingMailer();
    const resetApp = makeApp(loadConfig({}), { mailer });
    const res = await request(resetApp)
      .post('/api/v1/auth/password-reset/request')
      .send({ email: 'ghost@example.com' });
    expect(res.status).toBe(202); // never reveals that the account is unknown
    expect(mailer.sent).toEqual([]);
  });

  it('PasswordReset_BadToken_Returns401', async () => {
    const res = await request(app)
      .post('/api/v1/auth/password-reset/confirm')
      .send({ token: 'not-a-real-token', password: 'new-password' });
    expect(res.status).toBe(401);
  });

  it('PasswordReset_ShortPassword_Returns400', async () => {
    const res = await request(app)
      .post('/api/v1/auth/password-reset/confirm')
      .send({ token: 'whatever', password: 'short' });
    expect(res.status).toBe(400);
  });

  it('Auth_DefaultConfig_SessionCookieNotSecure', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ email: 'plain@example.com', password: 'supersecret' });
    expect(res.headers['set-cookie']?.[0] ?? '').not.toMatch(/Secure/);
  });

  it('Auth_SecureConfig_SetsSecureSessionCookie', async () => {
    const base = loadConfig({});
    const secureApp = makeApp({ ...base, auth: { ...base.auth, cookieSecure: true } });
    const res = await request(secureApp)
      .post('/api/v1/auth/register')
      .send({ email: 'secure@example.com', password: 'supersecret' });
    expect(res.status).toBe(201);
    expect(res.headers['set-cookie']?.[0] ?? '').toMatch(/Secure/);
  });

  it('Cors_Preflight_Returns204', async () => {
    const res = await request(app).options('/api/v1/applications');
    expect(res.status).toBe(204);
  });

  it('Cors_NoConfiguredOrigins_DoesNotEchoOrigin', async () => {
    // The default app has no CORS allow-list → same-origin only, so a
    // cross-origin browser never receives Access-Control-Allow-Origin.
    const res = await request(app).get('/api/v1/health').set('Origin', 'https://evil.example');
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('SecurityHeaders_PresentOnEveryResponse', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-frame-options']).toBe('SAMEORIGIN');
    expect(res.headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
  });

  it('Jobs_GetNoParams_RunsPreconfiguredSearchInTwoTiers', async () => {
    const res = await request(app).get('/api/v1/jobs');
    expect(res.status).toBe(200);
    expect(res.body.threshold).toBe(80);
    expect(Array.isArray(res.body.top)).toBe(true);
    expect(Array.isArray(res.body.more)).toBe(true);
    // every top hit is >= threshold, every "more" is below it
    expect(res.body.top.every((j: { match: number }) => j.match >= 80)).toBe(true);
    expect(res.body.more.every((j: { match: number }) => j.match < 80)).toBe(true);
    // top tier is sorted best-first and carries skill explanations
    expect(res.body.top[0]).toHaveProperty('matchedSkills');
    expect(res.body.top[0]).toHaveProperty('missingSkills');
    expect(res.body.counts.total).toBe(res.body.counts.top + res.body.counts.more);
  });

  it('Jobs_GetWithKeyword_FiltersBySearchTerm', async () => {
    const res = await request(app).get('/api/v1/jobs').query({ q: 'Rust' });
    expect(res.status).toBe(200);
    const all = [...res.body.top, ...res.body.more];
    expect(all.length).toBeGreaterThan(0);
    expect(
      all.every((j: { role: string; skills: string[] }) =>
        `${j.role} ${j.skills.join(' ')}`.toLowerCase().includes('rust'),
      ),
    ).toBe(true);
  });

  it('Jobs_GetWithThreshold_MovesBoundary', async () => {
    const res = await request(app).get('/api/v1/jobs').query({ threshold: 100 });
    expect(res.status).toBe(200);
    expect(res.body.threshold).toBe(100);
    expect(res.body.top.every((j: { match: number }) => j.match === 100)).toBe(true);
  });

  it('Ats_PostPostingText_ReturnsGapReport', async () => {
    const res = await request(app)
      .post('/api/v1/ats')
      .send({ role: 'Senior C++ Engineer', text: 'Build gRPC services with Kotlin.' });
    expect(res.status).toBe(200);
    // profile has C++ and gRPC, not Kotlin
    expect(res.body.matched).toEqual(expect.arrayContaining(['C++', 'gRPC']));
    expect(res.body.missing).toContain('Kotlin');
    expect(res.body.recommendations.length).toBe(res.body.missing.length);
    expect(res.body.score).toBeGreaterThan(0);
  });

  it('Ats_PostEmpty_Returns400Problem', async () => {
    const res = await request(app).post('/api/v1/ats').send({});
    expect(res.status).toBe(400);
    expect(res.headers['content-type']).toMatch(/application\/problem\+json/);
  });

  it('SavedSearch_CrudAndRun_Works', async () => {
    const empty = await request(app).get('/api/v1/searches');
    expect(empty.body).toEqual([]);

    const created = await request(app)
      .post('/api/v1/searches')
      .send({ name: 'Rust remote', q: 'Rust', threshold: 70 });
    expect(created.status).toBe(201);
    const id = created.body.search.id;
    expect(created.body.search).toMatchObject({
      name: 'Rust remote',
      query: { q: 'Rust', threshold: 70 },
    });

    const list = await request(app).get('/api/v1/searches');
    expect(list.body).toHaveLength(1);

    const run = await request(app).get(`/api/v1/searches/${id}/run`);
    expect(run.status).toBe(200);
    expect(run.body.threshold).toBe(70);
    expect(Array.isArray(run.body.top)).toBe(true);

    const del = await request(app).delete(`/api/v1/searches/${id}`);
    expect(del.status).toBe(204);
    expect((await request(app).get('/api/v1/searches')).body).toEqual([]);
  });

  it('SavedSearch_CreateMissingName_Returns400', async () => {
    const res = await request(app).post('/api/v1/searches').send({ q: 'Rust' });
    expect(res.status).toBe(400);
  });

  it('SavedSearch_RunUnknown_Returns404Problem', async () => {
    const res = await request(app).get('/api/v1/searches/nope/run');
    expect(res.status).toBe(404);
    expect(res.body).toMatchObject({ status: 404, title: 'NotFoundError' });
  });

  it('SavedSearch_DeleteUnknown_Returns404Problem', async () => {
    const res = await request(app).delete('/api/v1/searches/nope');
    expect(res.status).toBe(404);
  });

  it('Static_GetRoot_RedirectsToWorkspace', async () => {
    // The app opens directly on the recruiting Workspace — there is no launcher.
    const res = await request(app).get('/');
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/design/myjob/ui_kits/recruiting/dist/index.html');
  });

  it('LlmSettings_Get_ReturnsProvidersAndCurrent', async () => {
    const res = await request(app).get('/api/v1/settings/llm');
    expect(res.status).toBe(200);
    expect(res.body.current).toBe('claude');
    expect(res.body.providers.map((p: { id: string }) => p.id).sort()).toEqual([
      'claude',
      'gemini',
    ]);
    // No API keys configured in the test env → both providers report unavailable.
    expect(res.body.providers.every((p: { available: boolean }) => p.available === false)).toBe(
      true,
    );
  });

  it('LlmSettings_Put_SwitchesProvider', async () => {
    const res = await request(app).put('/api/v1/settings/llm').send({ provider: 'gemini' });
    expect(res.status).toBe(200);
    expect(res.body.current).toBe('gemini');
  });

  it('LlmSettings_PutUnknown_Returns400', async () => {
    const res = await request(app).put('/api/v1/settings/llm').send({ provider: 'openai' });
    expect(res.status).toBe(400);
  });

  it('CoverLetter_Post_FallsBackToTemplate', async () => {
    const res = await request(app)
      .post('/api/v1/cover-letter')
      .send({ company: 'Celonis', role: 'Senior C++ Engineer', city: 'München', skills: ['C++'] });
    expect(res.status).toBe(200);
    expect(res.body.provider).toBe('template'); // no keys → deterministic template
    expect(res.body.text).toContain('Celonis');
  });

  it('ApiKeys_Unauthenticated_Returns401', async () => {
    expect((await request(app).get('/api/v1/settings/keys')).status).toBe(401);
    expect((await request(app).put('/api/v1/settings/keys/claude').send({ key: 'x' })).status).toBe(
      401,
    );
  });

  it('ApiKeys_SetStatusRemove_Flow', async () => {
    const agent = request.agent(app);
    await agent
      .post('/api/v1/auth/register')
      .send({ email: 'keys@example.com', password: 'correct horse battery' });

    expect((await agent.get('/api/v1/settings/keys')).body).toEqual({
      claude: false,
      gemini: false,
    });
    expect((await agent.put('/api/v1/settings/keys/claude').send({ key: 'sk-ant-x' })).status).toBe(
      204,
    );
    expect((await agent.get('/api/v1/settings/keys')).body).toEqual({
      claude: true,
      gemini: false,
    });
    expect((await agent.delete('/api/v1/settings/keys/claude')).status).toBe(204);
    expect((await agent.get('/api/v1/settings/keys')).body.claude).toBe(false);
  });

  it('ApiKeys_UnknownProvider_Returns400', async () => {
    const agent = request.agent(app);
    await agent
      .post('/api/v1/auth/register')
      .send({ email: 'keys2@example.com', password: 'correct horse battery' });
    expect((await agent.put('/api/v1/settings/keys/openai').send({ key: 'x' })).status).toBe(400);
  });

  it('CoverLetter_PostMissingCompany_Returns400', async () => {
    const res = await request(app).post('/api/v1/cover-letter').send({ role: 'Engineer' });
    expect(res.status).toBe(400);
  });
});
