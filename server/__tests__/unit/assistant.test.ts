import { jest } from '@jest/globals';
import {
  DEFAULT_ASSISTANT_SETTINGS,
  isDue,
  isStale,
  suggestionKey,
  parseApplicationPayload,
} from '../../src/domain/assistant.js';
import { AssistantService } from '../../src/services/assistant-service.js';
import { AutopilotService } from '../../src/services/autopilot-service.js';
import { MatchService } from '../../src/services/match-service.js';
import { HashedEmbeddingProvider } from '../../src/adapters/hashed-embedding-provider.js';
import { CandidacyService } from '../../src/services/candidacy-service.js';
import { PlacementService } from '../../src/services/placement-service.js';
import { MandateService } from '../../src/services/mandate-service.js';
import { JobSearchService } from '../../src/services/job-search-service.js';
import { DocumentService } from '../../src/services/document-service.js';
import { AttachmentService } from '../../src/services/attachment-service.js';
import { buildDocumentAiService } from '../support/build-document-ai.js';
import { ApplicationBuilder } from '../../src/services/application-builder.js';
import { LlmService } from '../../src/services/llm-service.js';
import { KeywordSkillExtractor } from '../../src/adapters/keyword-skill-extractor.js';
import { ConflictError, NotFoundError } from '../../src/domain/errors.js';
import type { Candidacy } from '../../src/domain/candidacy.js';
import type { Mandate } from '../../src/domain/mandate.js';
import type { Talent } from '../../src/domain/talent.js';
import { saveDocumentsSchema } from '../../src/domain/talent-documents.js';
import {
  InMemoryAssistantSettingsStore,
  InMemoryAssistantSuggestionRepository,
  InMemoryMandateRepository,
  InMemoryTalentRepository,
  InMemoryDocumentRepository,
  InMemoryCandidacyRepository,
  InMemoryPlacementRepository,
  FixedClock,
  SequenceIdGenerator,
  noopLogger,
  InMemoryStageTransitionRepository,
  InMemoryUserRepository,
  InMemoryAttachmentStore,
  InMemoryApiKeyStore,
  InMemoryUsageMeter,
  InMemoryInterviewObservationRepository,
  InMemoryArtifactLogRepository,
  FakePdfRenderer,
  FakePdfMerger,
  FakePdfTextExtractor,
  FakeJobSource,
} from '../support/fakes.js';

const OWNER = 'team';
const NOW = '2026-07-03T10:00:00.000Z';

const mandate = (id: string, over: Partial<Mandate> = {}): Mandate => ({
  id,
  ownerId: OWNER,
  client: 'PayFlow AG',
  role: 'Backend Engineer',
  location: 'Berlin',
  fee: '25%',
  feeValue: '',
  deadline: '',
  priority: 'medium',
  status: 'active',
  submitted: 0,
  interviews: 0,
  jobText: 'Backend Engineer with Go and PostgreSQL',
  lang: 'en',
  createdAt: NOW,
  updatedAt: NOW,
  ...over,
});

const talent = (id: string, over: Partial<Talent> = {}): Talent => ({
  id,
  ownerId: OWNER,
  name: `Talent ${id}`,
  role: 'Backend Engineer',
  headline: '',
  location: 'Berlin',
  email: '',
  phone: '',
  availability: '',
  salary: '',
  skills: ['Go', 'PostgreSQL'],
  createdAt: NOW,
  updatedAt: NOW,
  ...over,
});

const candidacy = (id: string, over: Partial<Candidacy> = {}): Candidacy => ({
  id,
  ownerId: OWNER,
  mandateId: 'm1',
  talentId: 't1',
  stage: 'screening',
  note: '',
  order: 0,
  createdAt: NOW,
  updatedAt: NOW,
  ...over,
});

function ctx() {
  const settingsStore = new InMemoryAssistantSettingsStore();
  const suggestions = new InMemoryAssistantSuggestionRepository();
  const mandates = new InMemoryMandateRepository();
  const talents = new InMemoryTalentRepository();
  const documents = new InMemoryDocumentRepository();
  const candidacies = new InMemoryCandidacyRepository();
  const placements = new InMemoryPlacementRepository();
  const clock = new FixedClock(NOW);
  const matchService = new MatchService({
    mandateRepository: mandates,
    talentRepository: talents,
    documentRepository: documents,
    candidacyRepository: candidacies,
    embeddingProvider: new HashedEmbeddingProvider(),
  });
  const candidacyService = new CandidacyService({
    candidacyRepository: candidacies,
    mandateRepository: mandates,
    talentRepository: talents,
    placementService: new PlacementService({
      placementRepository: placements,
      clock,
      idGenerator: new SequenceIdGenerator('p'),
    }),
    stageTransitionRepository: new InMemoryStageTransitionRepository(),
    clock,
    idGenerator: new SequenceIdGenerator('c'),
    logger: noopLogger,
  });
  const attachmentStore = new InMemoryAttachmentStore();
  const users = new InMemoryUserRepository();
  const mandateService = new MandateService({
    mandateRepository: mandates,
    candidacyRepository: candidacies,
    clock,
    idGenerator: new SequenceIdGenerator('mandate'),
  });
  const jobSearchService = new JobSearchService({
    jobSource: new FakeJobSource(),
    skillExtractor: new KeywordSkillExtractor(),
    candidateProfile: { skills: [] },
    logger: noopLogger,
  });
  const documentService = new DocumentService({
    documentRepository: documents,
    talentRepository: talents,
    userRepository: users,
    attachmentStore,
    pdfRenderer: new FakePdfRenderer(),
    pdfMerger: new FakePdfMerger(),
    clock,
  });
  const attachmentService = new AttachmentService({
    attachmentStore,
    talentRepository: talents,
    userRepository: users,
    clock,
    idGenerator: new SequenceIdGenerator('att'),
  });
  const documentAiService = buildDocumentAiService({
    documentService,
    llmService: new LlmService({ providers: [], defaultProvider: 'claude', logger: noopLogger }),
    apiKeyStore: new InMemoryApiKeyStore(),
    userRepository: users,
    pdfTextExtractor: new FakePdfTextExtractor(''),
    usageMeter: new InMemoryUsageMeter(),
    interviewObservationRepository: new InMemoryInterviewObservationRepository(),
    artifactLogRepository: new InMemoryArtifactLogRepository(),
    idGenerator: new SequenceIdGenerator('art'),
    clock,
    logger: noopLogger,
  });
  const applicationBuilder = new ApplicationBuilder({
    documentAiService,
    documentService,
    attachmentService,
  });
  const assistantIds = new SequenceIdGenerator('s');
  const autopilotService = new AutopilotService({
    assistantSuggestionRepository: suggestions,
    mandateRepository: mandates,
    matchService,
    candidacyService,
    mandateService,
    jobSearchService,
    applicationBuilder,
    clock,
    idGenerator: assistantIds,
    logger: noopLogger,
  });
  const service = new AssistantService({
    assistantSettingsStore: settingsStore,
    assistantSuggestionRepository: suggestions,
    mandateRepository: mandates,
    talentRepository: talents,
    documentRepository: documents,
    candidacyRepository: candidacies,
    matchService,
    candidacyService,
    autopilotService,
    clock,
    idGenerator: assistantIds,
    logger: noopLogger,
  });
  return {
    service,
    settingsStore,
    suggestions,
    mandates,
    talents,
    documents,
    candidacies,
    candidacyService,
  };
}

describe('assistant domain', () => {
  it('IsDue_RespectsEnabledAndInterval', () => {
    expect(isDue({ ...DEFAULT_ASSISTANT_SETTINGS, enabled: false }, NOW)).toBe(false);
    expect(isDue({ ...DEFAULT_ASSISTANT_SETTINGS, enabled: true }, NOW)).toBe(true); // never ran
    const ranRecently = {
      ...DEFAULT_ASSISTANT_SETTINGS,
      enabled: true,
      intervalMinutes: 60,
      lastRunAt: '2026-07-03T09:30:00.000Z',
    };
    expect(isDue(ranRecently, NOW)).toBe(false);
    expect(isDue({ ...ranRecently, lastRunAt: '2026-07-03T08:59:00.000Z' }, NOW)).toBe(true);
  });

  it('IsStale_IgnoresTerminalStages', () => {
    const old = candidacy('c1', { updatedAt: '2026-06-20T10:00:00.000Z' });
    expect(isStale(old, NOW)).toBe(true);
    expect(isStale({ ...old, stage: 'placed' }, NOW)).toBe(false);
    expect(isStale({ ...old, stage: 'rejected' }, NOW)).toBe(false);
    expect(isStale({ ...old, updatedAt: '2026-07-01T10:00:00.000Z' }, NOW)).toBe(false);
  });

  it('SuggestionKey_DistinguishesKindMandateAndTalent', () => {
    expect(suggestionKey({ kind: 'follow-up', mandateId: 'm1', talentId: 't1' })).not.toBe(
      suggestionKey({ kind: 'shortlist-add', mandateId: 'm1', talentId: 't1' }),
    );
    // Absent ids collapse to a stable key (kind-wide dedup).
    expect(suggestionKey({ kind: 'data-gap' })).toBe('data-gap||');
  });
});

describe('AssistantService', () => {
  it('Run_ProposesShortlistForMatchingTalentNotInPipeline', async () => {
    const c = ctx();
    await c.mandates.add(mandate('m1'));
    await c.talents.add(talent('t1'));
    const result = await c.service.run(OWNER);
    expect(result.proposed).toBeGreaterThanOrEqual(1);
    const all = await c.suggestions.list(OWNER);
    const shortlist = all.find((s) => s.kind === 'shortlist-add');
    expect(shortlist).toMatchObject({ mandateId: 'm1', talentId: 't1', status: 'proposed' });
    expect(shortlist?.rationale).toContain('Match score');
    // nothing was applied — suggest mode stages only
    expect(await c.candidacies.listForMandate(OWNER, 'm1')).toHaveLength(0);
  });

  it('Run_SkipsPausedMandatesAndWeakMatches', async () => {
    const c = ctx();
    await c.mandates.add(mandate('m1', { status: 'paused' }));
    await c.talents.add(talent('t1'));
    await c.service.run(OWNER);
    expect((await c.suggestions.list(OWNER)).filter((s) => s.kind === 'shortlist-add')).toEqual([]);
  });

  it('Run_IsIdempotent_NoDuplicateSuggestionsAcrossRuns', async () => {
    const c = ctx();
    await c.mandates.add(mandate('m1'));
    await c.talents.add(talent('t1'));
    await c.service.run(OWNER);
    const second = await c.service.run(OWNER);
    expect(second.proposed).toBe(0);
    expect(
      (await c.suggestions.list(OWNER)).filter((s) => s.kind === 'shortlist-add'),
    ).toHaveLength(1);
  });

  it('Run_DismissedSuggestionIsNeverReproposed', async () => {
    const c = ctx();
    await c.mandates.add(mandate('m1'));
    await c.talents.add(talent('t1'));
    await c.service.run(OWNER);
    const [s] = await c.suggestions.list(OWNER);
    await c.service.dismiss(OWNER, s!.id);
    const rerun = await c.service.run(OWNER);
    expect(rerun.proposed).toBe(0);
  });

  it('Run_ActMode_AppliesShortlistDirectly', async () => {
    const c = ctx();
    await c.settingsStore.set(OWNER, {
      ...DEFAULT_ASSISTANT_SETTINGS,
      enabled: true,
      mode: 'act',
    });
    await c.mandates.add(mandate('m1'));
    await c.talents.add(talent('t1'));
    const result = await c.service.run(OWNER);
    expect(result.applied).toBe(1);
    const [s] = (await c.suggestions.list(OWNER)).filter((x) => x.kind === 'shortlist-add');
    expect(s?.status).toBe('auto-applied');
    const board = await c.candidacies.listForMandate(OWNER, 'm1');
    expect(board).toHaveLength(1);
    expect(board[0]?.note).toBe('Added by the assistant');
  });

  it('Run_ActMode_AutoApplyFailure_FallsBackToProposal', async () => {
    const c = ctx();
    await c.settingsStore.set(OWNER, { ...DEFAULT_ASSISTANT_SETTINGS, enabled: true, mode: 'act' });
    await c.mandates.add(mandate('m1'));
    await c.talents.add(talent('t1'));
    jest.spyOn(c.candidacyService, 'add').mockRejectedValue(new Error('boom'));
    const result = await c.service.run(OWNER);
    // The action failed → the finding is staged for review instead of lost.
    expect(result.applied).toBe(0);
    expect(result.proposed).toBeGreaterThanOrEqual(1);
    const [s] = (await c.suggestions.list(OWNER)).filter((x) => x.kind === 'shortlist-add');
    expect(s?.status).toBe('proposed');
  });

  it('Run_StaleCandidacyOfUnknownTalent_StillProposesFollowUp', async () => {
    const c = ctx();
    await c.mandates.add(mandate('m1'));
    await c.candidacies.add(
      candidacy('c1', { talentId: 'ghost', updatedAt: '2026-06-20T10:00:00.000Z' }),
    );
    await c.service.run(OWNER);
    const followUp = (await c.suggestions.list(OWNER)).find((s) => s.kind === 'follow-up');
    expect(followUp?.title).toContain('A candidate');
  });

  it('Run_FlagsStaleCandidacies', async () => {
    const c = ctx();
    await c.mandates.add(mandate('m1'));
    await c.talents.add(talent('t1'));
    await c.candidacies.add(candidacy('c1', { updatedAt: '2026-06-20T10:00:00.000Z' }));
    await c.service.run(OWNER);
    const followUp = (await c.suggestions.list(OWNER)).find((s) => s.kind === 'follow-up');
    expect(followUp?.rationale).toContain('13 days');
  });

  it('Run_FlagsTalentsWithoutSkillsOrDocuments', async () => {
    const c = ctx();
    await c.talents.add(talent('t1', { skills: [] }));
    await c.service.run(OWNER);
    const gap = (await c.suggestions.list(OWNER)).find((s) => s.kind === 'data-gap');
    expect(gap).toMatchObject({ talentId: 't1', status: 'proposed' });
  });

  it('Run_TalentWithoutSkillsButWithDocuments_IsNotFlagged', async () => {
    const c = ctx();
    await c.talents.add(talent('t1', { skills: [] }));
    await c.talents.add(talent('t2', { skills: [] }));
    // t1 proves substance via experience, t2 via a skill group — no data gap.
    const withExperience = saveDocumentsSchema.parse({
      resume: { experience: [{ role: 'Dev', company: 'X', bullets: [] }] },
    });
    const withSkillGroup = saveDocumentsSchema.parse({
      resume: { skillGroups: [{ label: 'Tools', items: ['Go'] }] },
    });
    await c.documents.save({ ownerId: OWNER, talentId: 't1', ...withExperience, updatedAt: NOW });
    await c.documents.save({ ownerId: OWNER, talentId: 't2', ...withSkillGroup, updatedAt: NOW });
    await c.service.run(OWNER);
    expect((await c.suggestions.list(OWNER)).filter((s) => s.kind === 'data-gap')).toEqual([]);
  });

  it('Run_StampsLastRunAt_SoTheSchedulerBacksOff', async () => {
    const c = ctx();
    await c.settingsStore.set(OWNER, { ...DEFAULT_ASSISTANT_SETTINGS, enabled: true });
    expect(await c.service.runIfDue(OWNER)).not.toBeNull();
    expect((await c.service.getSettings(OWNER)).lastRunAt).toBe(NOW);
    // second tick inside the interval → no run
    expect(await c.service.runIfDue(OWNER)).toBeNull();
  });

  it('RunIfDue_DisabledAssistantNeverRuns', async () => {
    const c = ctx();
    expect(await c.service.runIfDue(OWNER)).toBeNull();
  });

  it('Accept_ShortlistSuggestion_AddsThePipelineCandidacy', async () => {
    const c = ctx();
    await c.mandates.add(mandate('m1'));
    await c.talents.add(talent('t1'));
    await c.service.run(OWNER);
    const [s] = (await c.suggestions.list(OWNER)).filter((x) => x.kind === 'shortlist-add');
    const accepted = await c.service.accept(OWNER, s!.id);
    expect(accepted.status).toBe('accepted');
    expect(await c.candidacies.listForMandate(OWNER, 'm1')).toHaveLength(1);
  });

  it('Accept_WhenTalentWasAddedMeanwhile_ResolvesWithoutError', async () => {
    const c = ctx();
    await c.mandates.add(mandate('m1'));
    await c.talents.add(talent('t1'));
    await c.service.run(OWNER);
    const [s] = (await c.suggestions.list(OWNER)).filter((x) => x.kind === 'shortlist-add');
    await c.candidacies.add(candidacy('manual', { mandateId: 'm1', talentId: 't1' }));
    const accepted = await c.service.accept(OWNER, s!.id);
    expect(accepted.status).toBe('accepted');
  });

  it('Resolve_UnknownOrAlreadyResolved_Throws', async () => {
    const c = ctx();
    await expect(c.service.accept(OWNER, 'nope')).rejects.toBeInstanceOf(NotFoundError);
    await c.mandates.add(mandate('m1'));
    await c.talents.add(talent('t1'));
    await c.service.run(OWNER);
    const [s] = await c.suggestions.list(OWNER);
    await c.service.dismiss(OWNER, s!.id);
    await expect(c.service.dismiss(OWNER, s!.id)).rejects.toBeInstanceOf(ConflictError);
  });

  it('Settings_PersistAndMerge', async () => {
    const c = ctx();
    expect(await c.service.getSettings(OWNER)).toEqual(DEFAULT_ASSISTANT_SETTINGS);
    await c.service.updateSettings(OWNER, { enabled: true, mode: 'act' });
    expect(await c.service.getSettings(OWNER)).toMatchObject({
      enabled: true,
      mode: 'act',
      intervalMinutes: 60,
    });
  });
});

describe('AssistantService autopilot (ADR-0019)', () => {
  const autopilot = (over = {}) => ({
    enabled: true,
    mode: 'autopilot' as const,
    applySource: 'mandates' as const,
    minApplyScore: 10,
    intervalMinutes: 60,
    ...over,
  });

  it('MandatesSource_BuildsAndStagesApplicationForStrongMatch', async () => {
    const c = ctx();
    await c.settingsStore.set(OWNER, autopilot());
    await c.mandates.add(mandate('m1', { jobText: 'Go and PostgreSQL backend engineer' }));
    await c.talents.add(talent('t1', { name: 'Ada', skills: ['Go', 'PostgreSQL'] }));

    const res = await c.service.run(OWNER);
    expect(res.proposed).toBeGreaterThanOrEqual(1);
    const apps = (await c.suggestions.list(OWNER)).filter((s) => s.kind === 'application');
    expect(apps).toHaveLength(1);
    expect(apps[0]).toMatchObject({ talentId: 't1', mandateId: 'm1', status: 'proposed' });
    const payload = apps[0]!.payload as Record<string, unknown>;
    expect(payload.source).toBe('mandates');
    expect(payload.paragraphs).toHaveLength(3); // template cover letter
    expect(typeof payload.summary).toBe('string');
  });

  it('Dedup_DoesNotRebuildTheSameApplication', async () => {
    const c = ctx();
    await c.settingsStore.set(OWNER, autopilot());
    await c.mandates.add(mandate('m1', { jobText: 'Go PostgreSQL' }));
    await c.talents.add(talent('t1', { skills: ['Go', 'PostgreSQL'] }));
    await c.service.run(OWNER);
    await c.settingsStore.set(OWNER, { ...autopilot(), lastRunAt: undefined });
    await c.service.run(OWNER);
    const apps = (await c.suggestions.list(OWNER)).filter((s) => s.kind === 'application');
    expect(apps).toHaveLength(1); // second run staged nothing new
  });

  it('MinApplyScore_FiltersOutWeakMatches', async () => {
    const c = ctx();
    await c.settingsStore.set(OWNER, autopilot({ minApplyScore: 100 }));
    await c.mandates.add(mandate('m1', { jobText: 'Rust systems programming' }));
    await c.talents.add(talent('t1', { skills: ['COBOL'] }));
    await c.service.run(OWNER);
    expect((await c.suggestions.list(OWNER)).filter((s) => s.kind === 'application')).toEqual([]);
  });

  it('SuggestAndActModes_DoNotBuildApplications', async () => {
    const c = ctx();
    await c.settingsStore.set(OWNER, autopilot({ mode: 'act' }));
    await c.mandates.add(mandate('m1', { jobText: 'Go PostgreSQL' }));
    await c.talents.add(talent('t1', { skills: ['Go', 'PostgreSQL'] }));
    await c.service.run(OWNER);
    expect((await c.suggestions.list(OWNER)).filter((s) => s.kind === 'application')).toEqual([]);
  });

  it('ApproveApplication_MandatesSource_AddsCandidacy', async () => {
    const c = ctx();
    await c.settingsStore.set(OWNER, autopilot());
    await c.mandates.add(mandate('m1', { jobText: 'Go PostgreSQL' }));
    await c.talents.add(talent('t1', { skills: ['Go', 'PostgreSQL'] }));
    await c.service.run(OWNER);
    const app = (await c.suggestions.list(OWNER)).find((s) => s.kind === 'application')!;
    const accepted = await c.service.accept(OWNER, app.id);
    expect(accepted.status).toBe('accepted');
    const board = await c.candidacyService.board(OWNER, 'm1');
    expect(board.map((cd) => cd.talentId)).toContain('t1');
  });

  it('JobsSource_StagesApplicationsAndApproveMaterializesMandate', async () => {
    const c = ctx();
    // minScore 0 → any ranked talent qualifies against a sampled posting
    await c.settingsStore.set(OWNER, autopilot({ applySource: 'jobs', minApplyScore: 0 }));
    await c.talents.add(talent('t1', { name: 'Ada', skills: ['Go', 'PostgreSQL', 'AWS'] }));
    await c.service.run(OWNER);
    const app = (await c.suggestions.list(OWNER)).find((s) => s.kind === 'application');
    expect(app).toBeDefined();
    const payload = app!.payload as Record<string, unknown>;
    expect(payload.source).toBe('jobs');
    expect(payload.mandateId).toBe(''); // no mandate yet
    expect(app!.mandateId).toBeUndefined();

    // Approving materializes a mandate from the posting, then adds the candidacy.
    const before = (await c.mandates.list(OWNER)).length;
    await c.service.accept(OWNER, app!.id);
    expect((await c.mandates.list(OWNER)).length).toBe(before + 1);
  });

  it('RenderApplicationDossier_ReturnsPdf_And404sForNonApplication', async () => {
    const c = ctx();
    await c.settingsStore.set(OWNER, autopilot());
    await c.mandates.add(mandate('m1', { jobText: 'Go PostgreSQL' }));
    await c.talents.add(talent('t1', { skills: ['Go', 'PostgreSQL'] }));
    await c.service.run(OWNER);
    const app = (await c.suggestions.list(OWNER)).find((s) => s.kind === 'application')!;
    const pdf = await c.service.renderApplicationDossier(OWNER, app.id);
    expect(Buffer.isBuffer(pdf)).toBe(true);
    await expect(c.service.renderApplicationDossier(OWNER, 'nope')).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });

  it('ApproveApplication_MalformedStoredPayload_Throws', async () => {
    const c = ctx();
    await c.suggestions.add({
      id: 'bad1',
      ownerId: OWNER,
      kind: 'application',
      title: 'corrupt',
      rationale: 'corrupt',
      talentId: 't1',
      payload: { source: 'jobs' }, // missing every other required field
      status: 'proposed',
      createdAt: '2020-01-01T00:00:00.000Z',
      runId: 'r0',
    });
    await expect(c.service.accept(OWNER, 'bad1')).rejects.toThrow();
  });

  it('AutopilotRun_SkipsMalformedStagedPayload_StillStagesNewOne', async () => {
    const c = ctx();
    await c.settingsStore.set(OWNER, autopilot());
    // A corrupt legacy application record must not abort the dedup scan.
    await c.suggestions.add({
      id: 'bad1',
      ownerId: OWNER,
      kind: 'application',
      title: 'corrupt',
      rationale: 'corrupt',
      talentId: 't0',
      payload: {},
      status: 'proposed',
      createdAt: '2020-01-01T00:00:00.000Z',
      runId: 'r0',
    });
    await c.mandates.add(mandate('m1', { jobText: 'Go PostgreSQL' }));
    await c.talents.add(talent('t1', { skills: ['Go', 'PostgreSQL'] }));
    const res = await c.service.run(OWNER);
    expect(res.proposed).toBeGreaterThanOrEqual(1);
  });
});

describe('parseApplicationPayload', () => {
  const valid = {
    source: 'jobs' as const,
    targetRef: 'job-1',
    role: 'Backend Engineer',
    company: 'Helio',
    location: 'Remote',
    mandateId: '',
    jobText: 'Go and Kubernetes',
    lang: 'en',
    score: 82,
    summary: 'Tuned summary.',
    paragraphs: ['Intro.', 'Core.', 'Close.'],
    attachmentIds: [],
    provider: 'template',
    ungroundedCount: 0,
  };

  it('ValidPayload_RoundTripsThroughSchema', () => {
    expect(parseApplicationPayload({ ...valid })).toEqual(valid);
  });

  it('MissingRequiredField_Throws', () => {
    const { score: _score, ...missingScore } = valid;
    expect(() => parseApplicationPayload(missingScore)).toThrow();
  });

  it('WrongType_Throws', () => {
    expect(() => parseApplicationPayload({ ...valid, paragraphs: 'not-an-array' })).toThrow();
  });
});
