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
import { CandidacyController } from '../../src/http/candidacy-controller';
import { RetentionController } from '../../src/http/retention-controller';
import { MatchController } from '../../src/http/match-controller';
import { MatchAiController } from '../../src/http/match-ai-controller';
import { UsageController } from '../../src/http/usage-controller';
import { ComplianceController } from '../../src/http/compliance-controller';
import { ForecastController } from '../../src/http/forecast-controller';
import { ObservationController } from '../../src/http/observation-controller';
import { DocumentController } from '../../src/http/document-controller';
import { AttachmentController } from '../../src/http/attachment-controller';
import { AuthController } from '../../src/http/auth-controller';
import { MembersController } from '../../src/http/members-controller';
import { AccountController } from '../../src/http/account-controller';
import { PasswordResetController } from '../../src/http/password-reset-controller';
import { LlmService } from '../../src/services/llm-service';
import { MandateService } from '../../src/services/mandate-service';
import { TalentService } from '../../src/services/talent-service';
import { PlacementService } from '../../src/services/placement-service';
import { CandidacyService } from '../../src/services/candidacy-service';
import { RetentionService } from '../../src/services/retention-service';
import { MatchService } from '../../src/services/match-service';
import { AssistantService } from '../../src/services/assistant-service';
import { AssistantController } from '../../src/http/assistant-controller';
import { ArtifactController } from '../../src/http/artifact-controller';
import { MailController } from '../../src/http/mail-controller';
import { MailService } from '../../src/services/mail-service';
import { UsageService } from '../../src/services/usage-service';
import { ForecastService } from '../../src/services/forecast-service';
import { InterviewObservationService } from '../../src/services/interview-observation-service';
import { DocumentService } from '../../src/services/document-service';
import { DocumentAiService } from '../../src/services/document-ai-service';
import { AttachmentService } from '../../src/services/attachment-service';
import { AuthService } from '../../src/services/auth-service';
import { EmailVerificationService } from '../../src/services/email-verification-service';
import { MembersService } from '../../src/services/members-service';
import { AccountService } from '../../src/services/account-service';
import { PasswordResetService } from '../../src/services/password-reset-service';
import { MemorySessionStore } from '../../src/adapters/memory-session-store';
import { CoverLetterService } from '../../src/services/cover-letter-service';
import { AnthropicLlmProvider } from '../../src/adapters/anthropic-llm-provider';
import { GeminiLlmProvider } from '../../src/adapters/gemini-llm-provider';
import { nodeFetch } from '../../src/adapters/node-fetch';
import { SampleJobSource } from '../../src/adapters/sample-job-source';
import { KeywordSkillExtractor } from '../../src/adapters/keyword-skill-extractor';
import { RoleAuthorizer } from '../../src/adapters/role-authorizer';
import {
  InMemoryApplicationRepository,
  InMemoryArtifactLogRepository,
  InMemoryAssistantSettingsStore,
  InMemoryAssistantSuggestionRepository,
  InMemoryAuditLog,
  InMemoryPdfArchive,
  InMemorySavedSearchRepository,
  InMemoryMandateRepository,
  InMemoryTalentRepository,
  InMemoryPlacementRepository,
  InMemoryCandidacyRepository,
  InMemoryDocumentRepository,
  InMemoryAttachmentStore,
  InMemoryUserRepository,
  InMemoryApiKeyStore,
  InMemoryUsageMeter,
  InMemoryInterviewObservationRepository,
  InMemoryPasswordResetTokenStore,
  InMemoryEmailVerificationTokenStore,
  RecordingMailer,
  FakeInboxSource,
  InMemoryStageTransitionRepository,
  fakePasswordHasher,
  FakePdfRenderer,
  FakePdfMerger,
  FakePdfTextExtractor,
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
    emailVerificationTokenStore?: InMemoryEmailVerificationTokenStore;
    inboxSource?: FakeInboxSource;
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
  // Shared so per-user LLM keys set via /settings are seen by the AI helpers and
  // erased with the account.
  const apiKeyStore = new InMemoryApiKeyStore();
  const usageMeter = new InMemoryUsageMeter();
  // Shared so the per-user provider choice, auth and members management all
  // observe the same accounts.
  const userRepository = new InMemoryUserRepository();
  const llmController = new LlmController({
    llmService,
    coverLetterService: new CoverLetterService({
      llmService,
      candidate: config.candidate,
      usageMeter,
      clock: new FixedClock(),
      logger: noopLogger,
    }),
    apiKeyStore,
    userRepository,
  });
  // Shared repositories so the account (DSGVO) endpoints observe the same data
  // the recruiting endpoints write, and erasure affects the same auth state.
  const mandateRepository = new InMemoryMandateRepository();
  const talentRepository = new InMemoryTalentRepository();
  const placementRepository = new InMemoryPlacementRepository();
  const candidacyRepository = new InMemoryCandidacyRepository();
  const documentRepository = new InMemoryDocumentRepository();
  const attachmentStore = new InMemoryAttachmentStore();
  const sessionStore = new MemorySessionStore();
  const passwordResetTokenStore =
    opts.passwordResetTokenStore ?? new InMemoryPasswordResetTokenStore();
  const mailer = opts.mailer ?? new RecordingMailer();
  const mandateController = new MandateController({
    mandateService: new MandateService({
      mandateRepository,
      candidacyRepository,
      clock: new FixedClock(),
      idGenerator: new SequenceIdGenerator('mandate'),
    }),
  });
  const talentController = new TalentController({
    talentService: new TalentService({
      talentRepository,
      documentRepository,
      attachmentStore,
      candidacyRepository,
      clock: new FixedClock(),
      idGenerator: new SequenceIdGenerator('talent'),
    }),
  });
  // Shared so candidacies auto-booked when a card reaches 'placed' land in the
  // same placements the placement endpoints serve.
  const placementService = new PlacementService({
    placementRepository,
    clock: new FixedClock(),
    idGenerator: new SequenceIdGenerator('placement'),
  });
  const stageTransitionRepository = new InMemoryStageTransitionRepository();
  const candidacyService = new CandidacyService({
    candidacyRepository,
    mandateRepository,
    talentRepository,
    placementService,
    stageTransitionRepository,
    clock: new FixedClock(),
    idGenerator: new SequenceIdGenerator('cand'),
    logger: noopLogger,
  });
  const candidacyController = new CandidacyController({ candidacyService });
  const retentionController = new RetentionController({
    retentionService: new RetentionService({
      talentRepository,
      candidacyRepository,
      documentRepository,
      attachmentStore,
      clock: new FixedClock(),
    }),
    authorizer: new RoleAuthorizer(),
  });
  const matchService = new MatchService({
    mandateRepository,
    talentRepository,
    documentRepository,
    candidacyRepository,
  });
  const matchController = new MatchController({ matchService });
  const assistantController = new AssistantController({
    assistantService: new AssistantService({
      assistantSettingsStore: new InMemoryAssistantSettingsStore(),
      assistantSuggestionRepository: new InMemoryAssistantSuggestionRepository(),
      mandateRepository,
      talentRepository,
      documentRepository,
      candidacyRepository,
      matchService,
      candidacyService,
      clock: new FixedClock(),
      idGenerator: new SequenceIdGenerator('sugg'),
      logger: noopLogger,
    }),
  });
  const attachmentController = new AttachmentController({
    attachmentService: new AttachmentService({
      attachmentStore,
      talentRepository,
      userRepository,
      clock: new FixedClock(),
      idGenerator: new SequenceIdGenerator('att'),
    }),
  });
  const documentService = new DocumentService({
    documentRepository,
    talentRepository,
    userRepository,
    attachmentStore,
    pdfRenderer: new FakePdfRenderer(),
    pdfMerger: new FakePdfMerger(),
    clock: new FixedClock(),
  });
  const interviewObservationRepository = new InMemoryInterviewObservationRepository();
  const artifactLogRepository = new InMemoryArtifactLogRepository();
  const documentAiService = new DocumentAiService({
    documentService,
    llmService,
    apiKeyStore,
    userRepository,
    pdfTextExtractor: new FakePdfTextExtractor('Extracted CV text from PDF.'),
    usageMeter,
    interviewObservationRepository,
    artifactLogRepository,
    idGenerator: new SequenceIdGenerator('art'),
    clock: new FixedClock(),
    logger: noopLogger,
  });
  const artifactController = new ArtifactController({
    artifactLogRepository,
    clock: new FixedClock(),
  });
  const mailController = new MailController({
    mailService: new MailService({
      config,
      mailer,
      inboxSource: opts.inboxSource ?? new FakeInboxSource(),
      talentRepository,
      artifactLogRepository,
      logger: noopLogger,
    }),
  });
  const documentController = new DocumentController({ documentService, documentAiService });
  const matchAiController = new MatchAiController({ mandateRepository, documentAiService });
  const usageController = new UsageController({
    usageService: new UsageService({ usageMeter }),
  });
  const complianceController = new ComplianceController();
  const forecastController = new ForecastController({
    forecastService: new ForecastService({
      mandateRepository,
      candidacyRepository,
      stageTransitionRepository,
    }),
  });
  const observationController = new ObservationController({
    interviewObservationService: new InterviewObservationService({
      interviewObservationRepository,
      mandateRepository,
      clock: new FixedClock(),
      idGenerator: new SequenceIdGenerator('obs'),
    }),
  });
  const placementController = new PlacementController({ placementService });
  const emailVerificationTokenStore =
    opts.emailVerificationTokenStore ?? new InMemoryEmailVerificationTokenStore();
  const authController = new AuthController({
    authService: new AuthService({
      userRepository,
      sessionStore,
      passwordHasher: fakePasswordHasher,
      clock: new FixedClock(),
      idGenerator: new SequenceIdGenerator('user'),
    }),
    emailVerificationService: new EmailVerificationService({
      userRepository,
      emailVerificationTokenStore,
      mailer,
      logger: noopLogger,
      clock: new FixedClock(),
      config,
    }),
    config,
  });
  const accountController = new AccountController({
    accountService: new AccountService({
      userRepository,
      mandateRepository,
      talentRepository,
      placementRepository,
      apiKeyStore,
      sessionStore,
      passwordResetTokenStore,
      usageMeter,
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
  const membersController = new MembersController({
    membersService: new MembersService({ userRepository }),
    authorizer: new RoleAuthorizer(),
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
    candidacyController,
    retentionController,
    matchController,
    matchAiController,
    usageController,
    complianceController,
    forecastController,
    observationController,
    assistantController,
    artifactController,
    mailController,
    documentController,
    attachmentController,
    authController,
    membersController,
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

    it('Mandates_StoresAndReturnsJobText', async () => {
      const ad =
        'Senior C++ Engineer (m/w/d)\nAnforderungen: C++20, gRPC, verhandlungssicheres Deutsch.';
      const created = await agent
        .post('/api/v1/mandates')
        .send({ client: 'Aurora', role: 'C++ Engineer', location: 'Berlin', jobText: ad });
      expect(created.body.mandate.jobText).toBe(ad);
      const list = await agent.get('/api/v1/mandates');
      expect(list.body.find((m: { id: string }) => m.id === created.body.mandate.id).jobText).toBe(
        ad,
      );
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

    it('Mandates_SharedAcrossTeam_VisibleAndMutableByOtherMembers', async () => {
      const created = await agent
        .post('/api/v1/mandates')
        .send({ client: 'Aurora', role: 'C++ Engineer', location: 'Berlin' });
      const id = created.body.mandate.id;

      const teammate = request.agent(app);
      await teammate
        .post('/api/v1/auth/register')
        .send({ email: 'teammate@example.com', password: 'another good passphrase' });

      // The whole instance is one team, so the teammate sees and can work the
      // same shared mandate.
      expect((await teammate.get('/api/v1/mandates')).body).toHaveLength(1);
      expect(
        (await teammate.patch(`/api/v1/mandates/${id}`).send({ status: 'paused' })).status,
      ).toBe(200);
      expect((await agent.get('/api/v1/mandates')).body[0].status).toBe('paused');
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
      expect(get.body.documents.style.template).toBe('classic'); // schema default
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

    it('DocumentsParse_Text_ReturnsStructuredResume', async () => {
      const created = await agent.post('/api/v1/talents').send({ name: 'Lena Brandt' });
      const id = created.body.talent.id as string;
      // no LLM key in tests → deterministic fallback keeps the text as the summary
      const res = await agent
        .post(`/api/v1/talents/${id}/documents/parse`)
        .send({ text: 'Product Designer with 8 years experience.' });
      expect(res.status).toBe(200);
      expect(res.body.parsed.provider).toBe('template');
      expect(res.body.parsed.resume.summary).toContain('Product Designer');
      expect(Array.isArray(res.body.parsed.resume.experience)).toBe(true);
    });

    it('DocumentsParse_MissingText_Returns400', async () => {
      const created = await agent.post('/api/v1/talents').send({ name: 'Lena Brandt' });
      const id = created.body.talent.id as string;
      const res = await agent.post(`/api/v1/talents/${id}/documents/parse`).send({});
      expect(res.status).toBe(400);
    });

    it('DocumentsParsePdf_Base64_ReturnsStructuredResume', async () => {
      const created = await agent.post('/api/v1/talents').send({ name: 'Lena Brandt' });
      const id = created.body.talent.id as string;
      const dataBase64 = Buffer.from('%PDF-1.4 fake').toString('base64');
      const res = await agent
        .post(`/api/v1/talents/${id}/documents/parse-pdf`)
        .send({ dataBase64 });
      expect(res.status).toBe(200);
      // no LLM key → fallback keeps the (fake-)extracted text as the summary
      expect(res.body.parsed.provider).toBe('template');
      expect(res.body.parsed.resume.summary).toContain('Extracted CV text');
      expect(res.body.parsed.extractedChars).toBeGreaterThan(0);
    });

    it('DocumentsParsePdf_MissingFile_Returns400', async () => {
      const created = await agent.post('/api/v1/talents').send({ name: 'Lena Brandt' });
      const id = created.body.talent.id as string;
      const res = await agent.post(`/api/v1/talents/${id}/documents/parse-pdf`).send({});
      expect(res.status).toBe(400);
    });

    it('DocumentsAts_JobText_ReturnsScore', async () => {
      const created = await agent.post('/api/v1/talents').send({ name: 'Lena Brandt' });
      const id = created.body.talent.id as string;
      await agent
        .put(`/api/v1/talents/${id}/documents`)
        .send({ resume: { skillGroups: [{ label: 'Tools', items: ['Figma'] }] } });
      const res = await agent
        .post(`/api/v1/talents/${id}/documents/ats`)
        .send({ jobText: 'We need a designer skilled in Figma.' });
      expect(res.status).toBe(200);
      expect(res.body.ats.provider).toBe('template');
      expect(typeof res.body.ats.score).toBe('number');
      expect(res.body.ats.matched).toContain('Figma');
    });

    it('DocumentsAts_MissingJobText_Returns400', async () => {
      const created = await agent.post('/api/v1/talents').send({ name: 'Lena Brandt' });
      const id = created.body.talent.id as string;
      const res = await agent.post(`/api/v1/talents/${id}/documents/ats`).send({});
      expect(res.status).toBe(400);
    });

    it('DocumentsPitch_ReturnsShortProfile', async () => {
      const created = await agent.post('/api/v1/talents').send({ name: 'Lena Brandt' });
      const id = created.body.talent.id as string;
      await agent.put(`/api/v1/talents/${id}/documents`).send({
        contact: { name: 'Lena Brandt', role: 'Product Designer' },
        resume: { skillGroups: [{ label: 'Tools', items: ['Figma'] }] },
      });
      // no LLM key in tests → deterministic fallback assembles it from the facts
      const res = await agent
        .post(`/api/v1/talents/${id}/documents/pitch`)
        .send({ mandateContext: 'UX Lead gesucht' });
      expect(res.status).toBe(200);
      expect(res.body.pitch.provider).toBe('template');
      expect(res.body.pitch.headline).toContain('Lena Brandt');
      expect(Array.isArray(res.body.pitch.paragraphs)).toBe(true);
      expect(res.body.pitch.paragraphs.length).toBeGreaterThan(0);
    });

    it('DocumentsPitch_NoBody_UsesEmptyContext', async () => {
      const created = await agent.post('/api/v1/talents').send({ name: 'Lena Brandt' });
      const id = created.body.talent.id as string;
      const res = await agent.post(`/api/v1/talents/${id}/documents/pitch`).send({});
      expect(res.status).toBe(200);
      expect(res.body.pitch.provider).toBe('template');
    });

    it('DocumentsTranslate_WithoutKey_AsksForProvider', async () => {
      const created = await agent.post('/api/v1/talents').send({ name: 'Lena Brandt' });
      const id = created.body.talent.id as string;
      // No LLM key in tests → translation cannot fall back, so it returns a 400
      // problem+json telling the recruiter to add a key.
      const res = await agent
        .post(`/api/v1/talents/${id}/documents/translate`)
        .send({ targetLang: 'de' });
      expect(res.status).toBe(400);
      expect(res.body.detail).toMatch(/provider|key/i);
    });

    it('DocumentsTranslate_RejectsUnknownLang', async () => {
      const created = await agent.post('/api/v1/talents').send({ name: 'Lena Brandt' });
      const id = created.body.talent.id as string;
      const res = await agent
        .post(`/api/v1/talents/${id}/documents/translate`)
        .send({ targetLang: 'fr' });
      expect(res.status).toBe(400);
    });

    it('DocumentsOutreach_CandidateEmail_ReturnsSubjectAndBody', async () => {
      const created = await agent
        .post('/api/v1/talents')
        .send({ name: 'Lena Brandt', role: 'Product Designer' });
      const id = created.body.talent.id as string;
      const res = await agent
        .post(`/api/v1/talents/${id}/documents/outreach`)
        .send({ audience: 'candidate', channel: 'email', mandateContext: 'UX Lead' });
      expect(res.status).toBe(200);
      expect(res.body.message.provider).toBe('template');
      expect(res.body.message.subject.length).toBeGreaterThan(0);
      expect(res.body.message.body.length).toBeGreaterThan(0);
    });

    it('DocumentsOutreach_LinkedIn_HasNoSubject', async () => {
      const created = await agent.post('/api/v1/talents').send({ name: 'Lena Brandt' });
      const id = created.body.talent.id as string;
      const res = await agent
        .post(`/api/v1/talents/${id}/documents/outreach`)
        .send({ audience: 'client', channel: 'linkedin' });
      expect(res.status).toBe(200);
      expect(res.body.message.subject).toBe('');
      expect(res.body.message.body.length).toBeGreaterThan(0);
    });

    it('DocumentsOutreach_InvalidChannel_Returns400', async () => {
      const created = await agent.post('/api/v1/talents').send({ name: 'Lena Brandt' });
      const id = created.body.talent.id as string;
      const res = await agent
        .post(`/api/v1/talents/${id}/documents/outreach`)
        .send({ channel: 'sms' });
      expect(res.status).toBe(400);
    });

    it('Dossier_Get_ReturnsPdf', async () => {
      const created = await agent.post('/api/v1/talents').send({ name: 'Lena Brandt' });
      const id = created.body.talent.id as string;
      const res = await agent.get(`/api/v1/talents/${id}/dossier/pdf?company=Helio+GmbH`);
      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toMatch(/application\/pdf/);
    });

    it('Dossier_Unauthenticated_Returns401', async () => {
      const res = await request(app).get('/api/v1/talents/x/dossier/pdf');
      expect(res.status).toBe(401);
    });

    it('Dossier_UnknownTalent_Returns404', async () => {
      const res = await agent.get('/api/v1/talents/missing/dossier/pdf');
      expect(res.status).toBe(404);
    });

    it('Attachments_UploadListDownloadDelete_RoundTrips', async () => {
      const created = await agent.post('/api/v1/talents').send({ name: 'Lena Brandt' });
      const id = created.body.talent.id as string;
      const dataBase64 = Buffer.from('%PDF-1.4 ref').toString('base64');

      const up = await agent
        .post(`/api/v1/talents/${id}/attachments`)
        .send({ name: 'Zeugnis.pdf', dataBase64 });
      expect(up.status).toBe(201);
      const attId = up.body.attachment.id as string;
      expect(up.body.attachment).toMatchObject({ name: 'Zeugnis.pdf', talentId: id });

      const list = await agent.get(`/api/v1/talents/${id}/attachments`);
      expect(list.body).toHaveLength(1);

      const dl = await agent.get(`/api/v1/attachments/${attId}`);
      expect(dl.status).toBe(200);
      expect(dl.headers['content-type']).toMatch(/application\/pdf/);

      expect((await agent.delete(`/api/v1/attachments/${attId}`)).status).toBe(204);
      expect((await agent.get(`/api/v1/talents/${id}/attachments`)).body).toHaveLength(0);
    });

    it('Attachments_Upload_MissingFile_Returns400', async () => {
      const created = await agent.post('/api/v1/talents').send({ name: 'Lena Brandt' });
      const id = created.body.talent.id as string;
      const res = await agent.post(`/api/v1/talents/${id}/attachments`).send({ name: 'x.pdf' });
      expect(res.status).toBe(400);
    });

    it('Attachments_Unauthenticated_Returns401', async () => {
      const res = await request(app).get('/api/v1/talents/x/attachments');
      expect(res.status).toBe(401);
    });

    it('Dossier_WithAttachment_ReturnsMergedPdf', async () => {
      const created = await agent.post('/api/v1/talents').send({ name: 'Lena Brandt' });
      const id = created.body.talent.id as string;
      const up = await agent
        .post(`/api/v1/talents/${id}/attachments`)
        .send({ name: 'Zeugnis.pdf', dataBase64: Buffer.from('%PDF ref').toString('base64') });
      const res = await agent.get(
        `/api/v1/talents/${id}/dossier/pdf?attachments=${up.body.attachment.id}`,
      );
      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toMatch(/application\/pdf/);
    });

    it('Attachments_DeletingTalent_CascadesAttachments', async () => {
      const created = await agent.post('/api/v1/talents').send({ name: 'Lena Brandt' });
      const id = created.body.talent.id as string;
      const up = await agent
        .post(`/api/v1/talents/${id}/attachments`)
        .send({ name: 'x.pdf', dataBase64: Buffer.from('%PDF').toString('base64') });
      await agent.delete(`/api/v1/talents/${id}`);
      const res = await agent.get(`/api/v1/attachments/${up.body.attachment.id}`);
      expect(res.status).toBe(404); // cascaded away
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

    // --- Recruiting pipeline (candidacies) ---
    const seedMandateAndTalent = async (): Promise<{ mandateId: string; talentId: string }> => {
      const m = await agent
        .post('/api/v1/mandates')
        .send({ client: 'Aurora', role: 'C++ Engineer', location: 'Berlin' });
      const t = await agent.post('/api/v1/talents').send({ name: 'Lena Brandt', role: 'Engineer' });
      return { mandateId: m.body.mandate.id, talentId: t.body.talent.id };
    };

    it('Pipeline_AddTalentToMandate_Creates201WithCard', async () => {
      const { mandateId, talentId } = await seedMandateAndTalent();
      const res = await agent
        .post(`/api/v1/mandates/${mandateId}/candidacies`)
        .send({ talentId, stage: 'screening', note: 'strong' });
      expect(res.status).toBe(201);
      expect(res.body.candidacy).toMatchObject({
        mandateId,
        talentId,
        stage: 'screening',
        note: 'strong',
        order: 0,
      });
      expect(res.body.candidacy.talent).toMatchObject({ name: 'Lena Brandt' });
    });

    it('Pipeline_Board_ReturnsCards', async () => {
      const { mandateId, talentId } = await seedMandateAndTalent();
      await agent.post(`/api/v1/mandates/${mandateId}/candidacies`).send({ talentId });
      const res = await agent.get(`/api/v1/mandates/${mandateId}/candidacies`);
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0]).toMatchObject({ talentId, stage: 'sourced' });
    });

    it('Pipeline_DuplicateTalent_Returns409', async () => {
      const { mandateId, talentId } = await seedMandateAndTalent();
      await agent.post(`/api/v1/mandates/${mandateId}/candidacies`).send({ talentId });
      const res = await agent.post(`/api/v1/mandates/${mandateId}/candidacies`).send({ talentId });
      expect(res.status).toBe(409);
      expect(res.body).toMatchObject({ status: 409 });
    });

    it('Pipeline_AddToUnknownMandate_Returns404', async () => {
      const { talentId } = await seedMandateAndTalent();
      const res = await agent.post('/api/v1/mandates/nope/candidacies').send({ talentId });
      expect(res.status).toBe(404);
    });

    it('Pipeline_MoveStage_Updates', async () => {
      const { mandateId, talentId } = await seedMandateAndTalent();
      const created = await agent
        .post(`/api/v1/mandates/${mandateId}/candidacies`)
        .send({ talentId });
      const id = created.body.candidacy.id;
      const res = await agent.patch(`/api/v1/candidacies/${id}`).send({ stage: 'offer' });
      expect(res.status).toBe(200);
      expect(res.body.candidacy.stage).toBe('offer');
    });

    it('Pipeline_ForTalent_ListsMandates', async () => {
      const { mandateId, talentId } = await seedMandateAndTalent();
      await agent.post(`/api/v1/mandates/${mandateId}/candidacies`).send({ talentId });
      const res = await agent.get(`/api/v1/talents/${talentId}/candidacies`);
      expect(res.status).toBe(200);
      expect(res.body[0].mandate).toMatchObject({ client: 'Aurora' });
    });

    it('Pipeline_Remove_Returns204', async () => {
      const { mandateId, talentId } = await seedMandateAndTalent();
      const created = await agent
        .post(`/api/v1/mandates/${mandateId}/candidacies`)
        .send({ talentId });
      const res = await agent.delete(`/api/v1/candidacies/${created.body.candidacy.id}`);
      expect(res.status).toBe(204);
      const board = await agent.get(`/api/v1/mandates/${mandateId}/candidacies`);
      expect(board.body).toEqual([]);
    });

    it('Pipeline_MoveToPlaced_BooksPlacementAndSyncsCounters', async () => {
      const { mandateId, talentId } = await seedMandateAndTalent();
      const created = await agent
        .post(`/api/v1/mandates/${mandateId}/candidacies`)
        .send({ talentId, stage: 'interview' });
      // interview stage → counters reflect the board
      let mandates = await agent.get('/api/v1/mandates');
      let m = mandates.body.find((x) => x.id === mandateId);
      expect(m.submitted).toBe(1);
      expect(m.interviews).toBe(1);
      // move to placed → a placement is booked from talent + mandate
      await agent
        .patch(`/api/v1/candidacies/${created.body.candidacy.id}`)
        .send({ stage: 'placed' });
      const placements = await agent.get('/api/v1/placements');
      expect(placements.body).toHaveLength(1);
      expect(placements.body[0]).toMatchObject({ candidateName: 'Lena Brandt', client: 'Aurora' });
      mandates = await agent.get('/api/v1/mandates');
      m = mandates.body.find((x) => x.id === mandateId);
      expect(m.submitted).toBe(1);
      expect(m.interviews).toBe(1); // placed still counts as reached-interview
    });

    it('Pipeline_DeletingMandate_CascadesCandidacies', async () => {
      const { mandateId, talentId } = await seedMandateAndTalent();
      await agent.post(`/api/v1/mandates/${mandateId}/candidacies`).send({ talentId });
      await agent.delete(`/api/v1/mandates/${mandateId}`);
      const forTalent = await agent.get(`/api/v1/talents/${talentId}/candidacies`);
      expect(forTalent.body).toEqual([]);
    });

    it('Pipeline_Unauthenticated_Returns401', async () => {
      const res = await request(app).get('/api/v1/mandates/x/candidacies');
      expect(res.status).toBe(401);
    });

    // --- Mandate → shortlist matching ---
    it('Match_RanksPoolByFit', async () => {
      const { mandateId } = await seedMandateAndTalent();
      await agent
        .post('/api/v1/talents')
        .send({ name: 'Ada React', role: 'Engineer', skills: ['React', 'TypeScript'] });
      await agent.post('/api/v1/talents').send({ name: 'Old Cobol', skills: ['COBOL'] });
      const res = await agent
        .post(`/api/v1/mandates/${mandateId}/match`)
        .send({ jobText: 'We want React and TypeScript', limit: 5 });
      expect(res.status).toBe(200);
      const top = res.body.matches[0];
      expect(top.name).toBe('Ada React');
      expect(top.matched).toEqual(expect.arrayContaining(['React', 'TypeScript']));
      expect(top.inPipeline).toBe(false);
    });

    it('Match_EmptyJobText_MatchesOnMandate', async () => {
      const { mandateId } = await seedMandateAndTalent();
      await agent
        .post('/api/v1/talents')
        .send({ name: 'C Plus', role: 'C++ Engineer', skills: ['C++'] });
      const res = await agent.post(`/api/v1/mandates/${mandateId}/match`).send({});
      expect(res.status).toBe(200);
      expect(res.body.matches.length).toBeGreaterThan(0);
    });

    it('Match_UnknownMandate_Returns404', async () => {
      const res = await agent.post('/api/v1/mandates/nope/match').send({ jobText: 'x' });
      expect(res.status).toBe(404);
    });

    it('Match_Unauthenticated_Returns401', async () => {
      const res = await request(app).post('/api/v1/mandates/x/match').send({});
      expect(res.status).toBe(401);
    });

    // --- Explainable match (why this candidate fits) ---
    it('Explain_ReturnsGroundedReasons', async () => {
      const { mandateId, talentId } = await seedMandateAndTalent();
      const res = await agent
        .post(`/api/v1/mandates/${mandateId}/candidates/${talentId}/explain`)
        .send({});
      expect(res.status).toBe(200);
      // no LLM configured in CI → deterministic template, but always usable
      expect(res.body.explanation.provider).toBe('template');
      expect(Array.isArray(res.body.explanation.reasons)).toBe(true);
      expect(res.body.explanation.reasons.length).toBeGreaterThan(0);
    });

    it('Explain_UnknownMandate_Returns404', async () => {
      const { talentId } = await seedMandateAndTalent();
      const res = await agent.post(`/api/v1/mandates/nope/candidates/${talentId}/explain`).send({});
      expect(res.status).toBe(404);
    });

    it('Explain_Unauthenticated_Returns401', async () => {
      const res = await request(app).post('/api/v1/mandates/x/candidates/y/explain').send({});
      expect(res.status).toBe(401);
    });

    // --- Interview kit ---
    it('InterviewKit_ReturnsQuestionsAndScorecard', async () => {
      const { mandateId, talentId } = await seedMandateAndTalent();
      const res = await agent
        .post(`/api/v1/mandates/${mandateId}/candidates/${talentId}/interview-kit`)
        .send({});
      expect(res.status).toBe(200);
      expect(res.body.kit.provider).toBe('template'); // no LLM in CI
      expect(res.body.kit.questions.length).toBeGreaterThan(0);
      expect(res.body.kit.scorecard.length).toBeGreaterThan(0);
    });

    it('InterviewKit_UnknownMandate_Returns404', async () => {
      const { talentId } = await seedMandateAndTalent();
      const res = await agent
        .post(`/api/v1/mandates/nope/candidates/${talentId}/interview-kit`)
        .send({});
      expect(res.status).toBe(404);
    });

    it('InterviewKit_Unauthenticated_Returns401', async () => {
      const res = await request(app).post('/api/v1/mandates/x/candidates/y/interview-kit').send({});
      expect(res.status).toBe(401);
    });

    // --- Candidate preparation pack ---
    it('Prep_ReturnsGroundedPackFromJobAd', async () => {
      const m = await agent.post('/api/v1/mandates').send({
        client: 'Google',
        role: 'Frontend Engineer',
        location: 'Berlin',
        jobText: 'Frontend Engineer (m/w/d)\n- React erforderlich\n- Führerschein erforderlich',
      });
      const t = await agent.post('/api/v1/talents').send({ name: 'Lena', skills: ['React'] });
      // The prep reads the candidate's dossier — give them one with React.
      await agent.put(`/api/v1/talents/${t.body.talent.id}/documents`).send({
        resume: { skillGroups: [{ label: 'Frontend', items: ['React'] }] },
      });
      const res = await agent
        .post(`/api/v1/mandates/${m.body.mandate.id}/candidates/${t.body.talent.id}/prep`)
        .send({});
      expect(res.status).toBe(200);
      const prep = res.body.prep;
      expect(prep.provider).toBe('template'); // no LLM in CI
      expect(prep.companyLabel).toBe('US Big Tech'); // Google → curated archetype
      expect(prep.obligations.some((o: string) => o.includes('Führerschein'))).toBe(true);
      expect(prep.strengths).toContain('React');
      expect(prep.likelyQuestions.length).toBeGreaterThan(0);
      expect(prep.candidateQuestions.length).toBeGreaterThan(0);
    });

    it('Prep_UnknownMandate_Returns404', async () => {
      const { talentId } = await seedMandateAndTalent();
      const res = await agent.post(`/api/v1/mandates/nope/candidates/${talentId}/prep`).send({});
      expect(res.status).toBe(404);
    });

    it('Prep_Unauthenticated_Returns401', async () => {
      const res = await request(app).post('/api/v1/mandates/x/candidates/y/prep').send({});
      expect(res.status).toBe(401);
    });

    // --- Interview-observation flywheel ---
    it('Observations_RecordThenAggregate', async () => {
      const m = await agent
        .post('/api/v1/mandates')
        .send({ client: 'Trumpf SE + Co. KG', role: 'C++ Engineer', location: 'Ditzingen' });
      const mid = m.body.mandate.id;
      // no observations yet
      let res = await agent.get(`/api/v1/mandates/${mid}/observations`);
      expect(res.status).toBe(200);
      expect(res.body.profile).toBeNull();
      // record three
      for (let i = 0; i < 3; i++) {
        const rec = await agent
          .post(`/api/v1/mandates/${mid}/observations`)
          .send({ rounds: 3, formats: ['fachgespraech', 'presentation'], difficulty: 'medium' });
        expect(rec.status).toBe(201);
      }
      res = await agent.get(`/api/v1/mandates/${mid}/observations`);
      expect(res.body.profile.sampleSize).toBe(3);
      expect(res.body.profile.confidence).toBe('medium');
      expect(res.body.profile.formats[0].format).toBe('fachgespraech');
    });

    it('Observations_FeedIntoPrepAndRaiseConfidence', async () => {
      const m = await agent
        .post('/api/v1/mandates')
        .send({ client: 'Nischenfirma AG', role: 'Engineer', location: 'Berlin' });
      const mid = m.body.mandate.id;
      const t = await agent.post('/api/v1/talents').send({ name: 'Max' });
      // Baseline: unknown company → low-confidence default archetype
      let prep = await agent
        .post(`/api/v1/mandates/${mid}/candidates/${t.body.talent.id}/prep`)
        .send({});
      expect(prep.body.prep.companySource).toBe('archetype');
      expect(prep.body.prep.companyConfidence).toBe('low');
      // Record three observations → prep now reflects observed reality
      for (let i = 0; i < 3; i++) {
        await agent
          .post(`/api/v1/mandates/${mid}/observations`)
          .send({ rounds: 2, formats: ['case'], difficulty: 'high' });
      }
      prep = await agent
        .post(`/api/v1/mandates/${mid}/candidates/${t.body.talent.id}/prep`)
        .send({});
      expect(prep.body.prep.companySource).toBe('observed');
      expect(prep.body.prep.companyConfidence).toBe('medium');
      expect(prep.body.prep.formats[0]).toBe('Case-Interview'); // observed leads
    });

    it('Observations_Unauthenticated_Returns401', async () => {
      const res = await request(app).post('/api/v1/mandates/x/observations').send({});
      expect(res.status).toBe(401);
    });

    // --- AI usage counter ---
    it('Usage_Authenticated_ReturnsZeroedSummaryForNewUser', async () => {
      const res = await agent.get('/api/v1/settings/usage');
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        requests: 0,
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
        costUsd: 0,
      });
      expect(res.body.byProvider).toEqual([]);
      expect(res.body.byFeature).toEqual([]);
    });

    it('Usage_Unauthenticated_Returns401', async () => {
      const res = await request(app).get('/api/v1/settings/usage');
      expect(res.status).toBe(401);
    });

    // --- AGG compliance check ---
    it('Agg_FlagsDiscriminatoryWording', async () => {
      const res = await agent
        .post('/api/v1/compliance/agg-check')
        .send({ text: 'Junges Team sucht männlichen Muttersprachler.' });
      expect(res.status).toBe(200);
      expect(res.body.riskLevel).toBe('high');
      const categories = res.body.findings.map((f: { category: string }) => f.category);
      expect(categories).toEqual(expect.arrayContaining(['geschlecht', 'herkunft', 'alter']));
    });

    it('Agg_CleanText_ReturnsNone', async () => {
      const res = await agent
        .post('/api/v1/compliance/agg-check')
        .send({ text: 'Erfahrene Fachkraft (m/w/d) gesucht.' });
      expect(res.status).toBe(200);
      expect(res.body.riskLevel).toBe('none');
      expect(res.body.findings).toEqual([]);
    });

    it('Agg_Unauthenticated_Returns401', async () => {
      const res = await request(app).post('/api/v1/compliance/agg-check').send({ text: 'x' });
      expect(res.status).toBe(401);
    });

    // --- Pipeline revenue forecast ---
    it('Forecast_WeightsPipelineByStage', async () => {
      const m = await agent.post('/api/v1/mandates').send({
        client: 'Forecast Co',
        role: 'Engineer',
        location: 'Berlin',
        feeValue: '10.000 €',
      });
      const t = await agent.post('/api/v1/talents').send({ name: 'Cand One' });
      await agent
        .post(`/api/v1/mandates/${m.body.mandate.id}/candidacies`)
        .send({ talentId: t.body.talent.id, stage: 'offer' });
      const res = await agent.get('/api/v1/forecast');
      expect(res.status).toBe(200);
      const row = res.body.mandates.find(
        (x: { mandateId: string }) => x.mandateId === m.body.mandate.id,
      );
      expect(row.probability).toBe(0.7); // offer stage
      expect(row.weightedValue).toBe(7000); // 10000 × 0.7
      expect(res.body.totalWeighted).toBeGreaterThanOrEqual(7000);
      // Forecast v2: the curve is declared, transparently, per stage — with no
      // resolved history yet, every stage is an industry default.
      expect(res.body.probabilities).toHaveLength(4);
      for (const p of res.body.probabilities) {
        expect(p).toMatchObject({ source: 'default', wins: expect.any(Number) });
      }
      expect(res.body.insights).toEqual([]);
    });

    it('ForecastV2_StageMovesFeedTheTransitionLog', async () => {
      const m = await agent.post('/api/v1/mandates').send({
        client: 'Learn Co',
        role: 'Engineer',
        location: 'Berlin',
        feeValue: '5.000 €',
      });
      const t = await agent.post('/api/v1/talents').send({ name: 'Cand Two' });
      const added = await agent
        .post(`/api/v1/mandates/${m.body.mandate.id}/candidacies`)
        .send({ talentId: t.body.talent.id, stage: 'sourced' });
      // sourced → interview → placed: two moves plus the add are logged, and
      // the forecast reports the (still below-threshold) evidence.
      await agent
        .patch(`/api/v1/candidacies/${added.body.candidacy.id}`)
        .send({ stage: 'interview' });
      await agent.patch(`/api/v1/candidacies/${added.body.candidacy.id}`).send({ stage: 'placed' });
      const res = await agent.get('/api/v1/forecast');
      const interview = res.body.probabilities.find(
        (p: { stage: string }) => p.stage === 'interview',
      );
      expect(interview.sample).toBeGreaterThanOrEqual(1);
      expect(interview.wins).toBeGreaterThanOrEqual(1);
      expect(interview.source).toBe('default'); // one journey is not a curve
    });

    it('Forecast_Unauthenticated_Returns401', async () => {
      const res = await request(app).get('/api/v1/forecast');
      expect(res.status).toBe(401);
    });

    // --- Team members / roles (the first-registered agent is the admin) ---
    // --- DSGVO retention (admin-only) ---
    it('Retention_AdminAnonymizesCandidate', async () => {
      const created = await agent
        .post('/api/v1/talents')
        .send({ name: 'Lena Brandt', email: 'lena@x.de', role: 'Designer' });
      const id = created.body.talent.id as string;
      const res = await agent.post(`/api/v1/talents/${id}/anonymize`);
      expect(res.status).toBe(200);
      expect(res.body.talent.name).toBe('Anonymisiert');
      expect(res.body.talent.email).toBe('');
      expect(res.body.talent.role).toBe('Designer'); // non-identifying kept
      expect(typeof res.body.talent.anonymizedAt).toBe('string');
    });

    it('Retention_AdminGetsReport', async () => {
      // no ?days → the default review window is used
      expect((await agent.get('/api/v1/retention/report')).status).toBe(200);
      // explicit ?days is honoured
      const res = await agent.get('/api/v1/retention/report?days=0');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('Retention_RecruiterForbidden_Returns403', async () => {
      const created = await agent.post('/api/v1/talents').send({ name: 'Lena Brandt' });
      const id = created.body.talent.id as string;
      const recruiter = request.agent(app);
      await recruiter
        .post('/api/v1/auth/register')
        .send({ email: 'mate@example.com', password: 'correct horse battery' });
      expect((await recruiter.get('/api/v1/retention/report')).status).toBe(403);
      expect((await recruiter.post(`/api/v1/talents/${id}/anonymize`)).status).toBe(403);
    });

    it('Retention_Unauthenticated_Returns401', async () => {
      expect((await request(app).get('/api/v1/retention/report')).status).toBe(401);
    });

    it('Members_AdminListsTeam_WithRoles', async () => {
      const second = request.agent(app);
      await second
        .post('/api/v1/auth/register')
        .send({ email: 'mate@example.com', password: 'correct horse battery' });
      const res = await agent.get('/api/v1/members');
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
      const admin = res.body.find((m: { email: string }) => m.email === 'recruiter@example.com');
      const mate = res.body.find((m: { email: string }) => m.email === 'mate@example.com');
      expect(admin.roles).toContain('admin');
      expect(mate.roles).toEqual(['recruiter']);
    });

    it('Members_AdminPromotesMember', async () => {
      const second = request.agent(app);
      const reg = await second
        .post('/api/v1/auth/register')
        .send({ email: 'mate@example.com', password: 'correct horse battery' });
      const id = reg.body.user.id as string;
      const res = await agent
        .patch(`/api/v1/members/${id}/roles`)
        .send({ roles: ['recruiter', 'admin'] });
      expect(res.status).toBe(200);
      expect(res.body.member.roles).toEqual(['recruiter', 'admin']);
    });

    it('Members_RecruiterForbidden_Returns403', async () => {
      const second = request.agent(app);
      await second
        .post('/api/v1/auth/register')
        .send({ email: 'mate@example.com', password: 'correct horse battery' });
      const res = await second.get('/api/v1/members');
      expect(res.status).toBe(403);
      expect(res.body).toMatchObject({ status: 403 });
    });

    it('Members_DemotingLastAdmin_Returns400', async () => {
      const me = await agent.get('/api/v1/auth/me');
      const id = me.body.user.id as string;
      const res = await agent.patch(`/api/v1/members/${id}/roles`).send({ roles: ['recruiter'] });
      expect(res.status).toBe(400);
    });

    it('Members_InvalidRole_Returns400', async () => {
      const me = await agent.get('/api/v1/auth/me');
      const id = me.body.user.id as string;
      const res = await agent.patch(`/api/v1/members/${id}/roles`).send({ roles: ['wizard'] });
      expect(res.status).toBe(400);
    });

    it('Members_Unauthenticated_Returns401', async () => {
      const res = await request(app).get('/api/v1/members');
      expect(res.status).toBe(401);
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

    it('AccountDelete_EndsSession_ButLeavesTeamData', async () => {
      await agent
        .post('/api/v1/mandates')
        .send({ client: 'Aurora', role: 'C++', location: 'Berlin' });
      const del = await agent.delete('/api/v1/account');
      expect(del.status).toBe(204);
      // the session is gone — /auth/me now reports no user
      expect((await agent.get('/api/v1/auth/me')).body).toEqual({ user: null });
      // the team's shared data survives one member leaving: a new member sees it
      const teammate = request.agent(app);
      await teammate
        .post('/api/v1/auth/register')
        .send({ email: 'teammate@example.com', password: 'correct horse battery' });
      expect((await teammate.get('/api/v1/mandates')).body).toHaveLength(1);
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

  it('Auth_LoginRateLimited_Returns429Problem', async () => {
    // Arrange: exhaust the credential limiter (10 per window, shared per IP).
    for (let i = 0; i < 10; i += 1) {
      await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'rl@example.com', password: 'wrongpass' });
    }
    // Act
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'rl@example.com', password: 'wrongpass' });
    // Assert: problem+json with an actionable detail, not a plain-text body.
    expect(res.status).toBe(429);
    expect(res.body).toMatchObject({ status: 429, title: 'Too Many Requests' });
    expect(res.body.detail).toMatch(/Too many attempts/);
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
    // register fires a verification mail too, so filter for the reset one
    expect(mailer.sent.filter((m) => m.subject.startsWith('Reset'))).toHaveLength(1);
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

  it('VerifyEmail_RequestThenConfirm_MarksAccountVerified', async () => {
    const mailer = new RecordingMailer();
    const tokens = new InMemoryEmailVerificationTokenStore();
    const verifyApp = makeApp(loadConfig({}), { mailer, emailVerificationTokenStore: tokens });
    const agent = request.agent(verifyApp);
    await agent
      .post('/api/v1/auth/register')
      .send({ email: 'verify@example.com', password: 'supersecret' });

    // Arrange: explicit resend (awaited server-side, unlike the register send)
    const req = await agent.post('/api/v1/auth/verify-email/request');
    expect(req.status).toBe(202);
    const verifyMail = mailer.sent.find((m) => m.subject.startsWith('Confirm'));
    expect(verifyMail).toBeDefined();
    const token = tokens.tokens[tokens.tokens.length - 1]!.token;
    expect(verifyMail!.text).toContain('verify_token=');

    // Act
    const confirm = await agent.post('/api/v1/auth/verify-email/confirm').send({ token });
    // Assert: 204 and /auth/me now carries verifiedAt
    expect(confirm.status).toBe(204);
    const me = await agent.get('/api/v1/auth/me');
    expect(me.body.user.verifiedAt).toBeDefined();
  });

  it('VerifyEmail_BadToken_Returns401', async () => {
    const res = await request(app)
      .post('/api/v1/auth/verify-email/confirm')
      .send({ token: 'not-a-real-token' });
    expect(res.status).toBe(401);
  });

  it('VerifyEmail_RequestWithoutSession_Returns401', async () => {
    const res = await request(app).post('/api/v1/auth/verify-email/request');
    expect(res.status).toBe(401);
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

  it('Assistant_Unauthenticated_Returns401', async () => {
    expect((await request(app).get('/api/v1/assistant')).status).toBe(401);
    expect((await request(app).post('/api/v1/assistant/run')).status).toBe(401);
  });

  it('Assistant_FullFlow_EnableRunReviewAccept', async () => {
    const agent = request.agent(app);
    await agent
      .post('/api/v1/auth/register')
      .send({ email: 'assistant@example.com', password: 'correct horse battery' });

    // Off by default; running while off is a 400 with a hint.
    const before = await agent.get('/api/v1/assistant');
    expect(before.body.settings).toMatchObject({ enabled: false, mode: 'suggest' });
    expect((await agent.post('/api/v1/assistant/run')).status).toBe(400);

    // Enable (persisted), seed a mandate + a matching talent, run.
    const put = await agent.put('/api/v1/assistant').send({ enabled: true, intervalMinutes: 240 });
    expect(put.body.settings).toMatchObject({ enabled: true, intervalMinutes: 240 });
    await agent.post('/api/v1/mandates').send({
      client: 'PayFlow AG',
      role: 'Backend Engineer',
      location: 'Berlin',
      jobText: 'Backend Engineer with Go and PostgreSQL experience',
    });
    await agent.post('/api/v1/talents').send({
      name: 'Jonas Keller',
      role: 'Backend Engineer',
      skills: ['Go', 'PostgreSQL'],
    });
    const run = await agent.post('/api/v1/assistant/run');
    expect(run.status).toBe(200);
    expect(run.body.proposed).toBeGreaterThanOrEqual(1);

    // The queue holds a shortlist suggestion; accepting adds the candidacy.
    const queue = await agent.get('/api/v1/assistant/suggestions');
    const shortlist = queue.body.find((s: { kind: string }) => s.kind === 'shortlist-add');
    expect(shortlist.title).toContain('Jonas Keller');
    const accept = await agent.post(`/api/v1/assistant/suggestions/${shortlist.id}/accept`);
    expect(accept.body.suggestion.status).toBe('accepted');
    const mandates = await agent.get('/api/v1/mandates');
    const board = await agent.get(`/api/v1/mandates/${mandates.body[0].id}/candidacies`);
    expect(board.body).toHaveLength(1);
    expect(board.body[0].talent.name).toBe('Jonas Keller');

    // Resolving twice conflicts; the overview counts reflect the outcome.
    expect((await agent.post(`/api/v1/assistant/suggestions/${shortlist.id}/dismiss`)).status).toBe(
      409,
    );
    const after = await agent.get('/api/v1/assistant');
    expect(after.body.counts.accepted).toBe(1);
    expect(after.body.settings.lastRunAt).toBeTruthy();
  });

  it('Assistant_ActModeAndDismiss_ReflectInCounts', async () => {
    const agent = request.agent(app);
    await agent
      .post('/api/v1/auth/register')
      .send({ email: 'assistant-act@example.com', password: 'correct horse battery' });
    await agent.put('/api/v1/assistant').send({ enabled: true, mode: 'act' });
    await agent.post('/api/v1/mandates').send({
      client: 'Helio GmbH',
      role: 'Platform Engineer',
      location: 'Hamburg',
      jobText: 'Platform Engineer with Kubernetes and Go',
    });
    // One clear match (auto-applied in act mode) + one empty profile (data gap).
    await agent.post('/api/v1/talents').send({
      name: 'Mila Sommer',
      role: 'Platform Engineer',
      skills: ['Kubernetes', 'Go'],
    });
    await agent.post('/api/v1/talents').send({ name: 'Empty Profile' });
    const run = await agent.post('/api/v1/assistant/run');
    expect(run.body.applied).toBeGreaterThanOrEqual(1);

    // The auto-applied shortlist landed on the board without any accept.
    const mandates = await agent.get('/api/v1/mandates');
    const helio = mandates.body.find((m: { client: string }) => m.client === 'Helio GmbH');
    const board = await agent.get(`/api/v1/mandates/${helio.id}/candidacies`);
    expect(board.body.some((c: { note: string }) => c.note === 'Added by the assistant')).toBe(
      true,
    );

    // Dismiss the data-gap suggestion; the overview counts every status.
    const queue = await agent.get('/api/v1/assistant/suggestions');
    const gap = queue.body.find((s: { kind: string }) => s.kind === 'data-gap');
    await agent.post(`/api/v1/assistant/suggestions/${gap.id}/dismiss`);
    const overview = await agent.get('/api/v1/assistant');
    expect(overview.body.counts.autoApplied).toBeGreaterThanOrEqual(1);
    expect(overview.body.counts.dismissed).toBeGreaterThanOrEqual(1);
  });

  it('CoverLetter_SignedInWithoutKey_UsesTheStoredProviderChoiceAndFallsBack', async () => {
    // The authed path resolves the user's persisted provider, finds no key,
    // and degrades to the template — no upstream call is made.
    const agent = request.agent(app);
    await agent
      .post('/api/v1/auth/register')
      .send({ email: 'letter-authed@example.com', password: 'correct horse battery' });
    await agent.put('/api/v1/settings/llm').send({ provider: 'gemini' });
    const res = await agent
      .post('/api/v1/cover-letter')
      .send({ company: 'Helio', role: 'Engineer', city: 'Berlin', skills: ['Go'] });
    expect(res.status).toBe(200);
    expect(res.body.provider).toBe('template');
    expect(res.body.text).toContain('Helio');
  });

  it('Artifacts_Unauthenticated_Returns401', async () => {
    expect((await request(app).get('/api/v1/artifacts')).status).toBe(401);
  });

  it('Artifacts_OutcomeLoop_LogStampAggregate', async () => {
    const agent = request.agent(app);
    await agent
      .post('/api/v1/auth/register')
      .send({ email: 'loop@example.com', password: 'correct horse battery' });
    const talent = await agent
      .post('/api/v1/talents')
      .send({ name: 'Nora Weiss', role: 'Data Engineer', skills: ['Python'] });
    const talentId = talent.body.talent.id;

    // Generating outreach logs an artifact (template here — no key configured).
    await agent
      .post(`/api/v1/talents/${talentId}/documents/outreach`)
      .send({ audience: 'candidate', channel: 'email' });
    const list = await agent.get(`/api/v1/artifacts?talentId=${talentId}`);
    expect(list.body).toHaveLength(1);
    expect(list.body[0]).toMatchObject({
      kind: 'outreach',
      provider: 'template',
      channel: 'email',
      outcome: 'pending',
    });

    // Stamp the fate; the stats reflect it.
    const id = list.body[0].id;
    expect(
      (await agent.post(`/api/v1/artifacts/${id}/outcome`).send({ outcome: 'ghosted' })).status,
    ).toBe(400);
    const stamped = await agent
      .post(`/api/v1/artifacts/${id}/outcome`)
      .send({ outcome: 'replied' });
    expect(stamped.body.artifact).toMatchObject({ outcome: 'replied' });
    expect(stamped.body.artifact.outcomeAt).toBeTruthy();
    const stats = await agent.get('/api/v1/artifacts/stats');
    const outreach = stats.body.byKind.find((b: { kind: string }) => b.kind === 'outreach');
    expect(outreach).toMatchObject({ sent: 1, replied: 1, replyRate: 100 });
    // The unfiltered list covers the whole team scope.
    expect((await agent.get('/api/v1/artifacts')).body.length).toBeGreaterThanOrEqual(1);

    expect(
      (await agent.post('/api/v1/artifacts/nope/outcome').send({ outcome: 'replied' })).status,
    ).toBe(404);
  });

  it('Mail_Unauthenticated_Returns401', async () => {
    expect((await request(app).get('/api/v1/mail/status')).status).toBe(401);
    expect((await request(app).post('/api/v1/mail/sync-replies')).status).toBe(401);
  });

  it('Mail_SendOutreach_DeliversAndValidates', async () => {
    const mailer = new RecordingMailer();
    const mailApp = makeApp(loadConfig({}), { mailer });
    const agent = request.agent(mailApp);
    await agent
      .post('/api/v1/auth/register')
      .send({ email: 'sender@example.com', password: 'correct horse battery' });
    const withEmail = await agent
      .post('/api/v1/talents')
      .send({ name: 'Mia Roth', email: 'mia@example.com' });
    const noEmail = await agent.post('/api/v1/talents').send({ name: 'No Mail' });

    const sent = await agent
      .post(`/api/v1/talents/${withEmail.body.talent.id}/outreach/send`)
      .send({ subject: 'Opportunity', body: 'Hello Mia' });
    expect(sent.status).toBe(200);
    expect(sent.body).toEqual({ sent: true, to: 'mia@example.com' });
    // register fires a verification mail through the same mailer — filter it out
    expect(mailer.sent.filter((m) => m.to === 'mia@example.com')).toEqual([
      { to: 'mia@example.com', subject: 'Opportunity', text: 'Hello Mia' },
    ]);

    // Talent without an address → 400; empty subject → 400; ghost talent → 404.
    expect(
      (
        await agent
          .post(`/api/v1/talents/${noEmail.body.talent.id}/outreach/send`)
          .send({ subject: 'Hi', body: 'Text' })
      ).status,
    ).toBe(400);
    expect(
      (
        await agent
          .post(`/api/v1/talents/${withEmail.body.talent.id}/outreach/send`)
          .send({ subject: '', body: 'Text' })
      ).status,
    ).toBe(400);
    expect(
      (await agent.post('/api/v1/talents/ghost/outreach/send').send({ subject: 'Hi', body: 'T' }))
        .status,
    ).toBe(404);
  });

  it('Mail_SyncReplies_StampsPendingOutreachFromInbox', async () => {
    // IMAP configured + a scripted inbox: the loop closes without manual stamping.
    const base = loadConfig({});
    const config = {
      ...base,
      mail: { ...base.mail, imap: { ...base.mail.imap, host: 'imap.example.com' } },
    };
    const inboxSource = new FakeInboxSource();
    const syncApp = makeApp(config, { inboxSource });
    const agent = request.agent(syncApp);
    await agent
      .post('/api/v1/auth/register')
      .send({ email: 'desk@example.com', password: 'correct horse battery' });

    const status = await agent.get('/api/v1/mail/status');
    expect(status.body).toMatchObject({ replySync: true, sendTransport: 'console' });

    const talent = await agent
      .post('/api/v1/talents')
      .send({ name: 'Lena Falk', email: 'lena@example.com' });
    const talentId = talent.body.talent.id;
    await agent
      .post(`/api/v1/talents/${talentId}/documents/outreach`)
      .send({ audience: 'candidate', channel: 'email' });

    // The talent writes back after the outreach was generated (FixedClock).
    inboxSource.messages = [
      {
        from: 'Lena Falk <Lena@Example.com>',
        receivedAt: '2026-06-26T08:00:00.000Z',
        subject: 'Re',
      },
    ];
    const sync = await agent.post('/api/v1/mail/sync-replies');
    expect(sync.status).toBe(200);
    expect(sync.body).toEqual({ checked: 1, messages: 1, replies: 1 });
    const list = await agent.get(`/api/v1/artifacts?talentId=${talentId}`);
    expect(list.body[0]).toMatchObject({
      outcome: 'replied',
      outcomeAt: '2026-06-26T08:00:00.000Z',
    });
  });

  it('Mail_SyncReplies_WithoutMailbox_Returns400', async () => {
    const agent = request.agent(app);
    await agent
      .post('/api/v1/auth/register')
      .send({ email: 'nomailbox@example.com', password: 'correct horse battery' });
    expect((await agent.post('/api/v1/mail/sync-replies')).status).toBe(400);
  });

  it('ApiDocs_OpenApiSpec_IsServed', async () => {
    const res = await request(app).get('/api/v1/openapi.yaml');
    expect(res.status).toBe(200);
    expect(res.text).toContain('openapi: 3.1.0');
    expect(res.text).toContain('/settings/llm:'); // covers the recruiting surface
  });

  it('ApiDocs_SwaggerUi_IsServedSelfHostedWithCsp', async () => {
    const page = await request(app).get('/api/v1/docs');
    expect(page.status).toBe(200);
    expect(page.text).toContain('swagger-ui-bundle.js');
    expect(page.text).not.toContain('https://'); // no CDN — everything same-origin
    expect(page.headers['content-security-policy']).toContain("script-src 'self'");
    const asset = await request(app).get('/api/v1/docs/swagger-ui-bundle.js');
    expect(asset.status).toBe(200);
    const init = await request(app).get('/api/v1/docs/swagger-initializer.js');
    expect(init.status).toBe(200);
    expect(init.text).toContain('/api/v1/openapi.yaml');
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

  it('LlmSettings_Put_Unauthenticated_Returns401', async () => {
    // The provider choice is per user, so switching requires a session.
    const res = await request(app).put('/api/v1/settings/llm').send({ provider: 'gemini' });
    expect(res.status).toBe(401);
  });

  it('LlmSettings_Put_PersistsPerUser_WithoutLeakingAcrossUsers', async () => {
    const alice = request.agent(app);
    await alice
      .post('/api/v1/auth/register')
      .send({ email: 'alice-llm@example.com', password: 'correct horse battery' });
    const put = await alice.put('/api/v1/settings/llm').send({ provider: 'gemini' });
    expect(put.status).toBe(200);
    expect(put.body.current).toBe('gemini');
    // Alice keeps her choice on the next read …
    expect((await alice.get('/api/v1/settings/llm')).body.current).toBe('gemini');
    // … while a signed-out reader and another user still see the default.
    expect((await request(app).get('/api/v1/settings/llm')).body.current).toBe('claude');
    const bob = request.agent(app);
    await bob
      .post('/api/v1/auth/register')
      .send({ email: 'bob-llm@example.com', password: 'correct horse battery' });
    expect((await bob.get('/api/v1/settings/llm')).body.current).toBe('claude');
  });

  it('LlmSettings_PutUnknown_Returns400', async () => {
    const agent = request.agent(app);
    await agent
      .post('/api/v1/auth/register')
      .send({ email: 'llm-unknown@example.com', password: 'correct horse battery' });
    const res = await agent.put('/api/v1/settings/llm').send({ provider: 'openai' });
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
