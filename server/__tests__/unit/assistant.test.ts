import {
  DEFAULT_ASSISTANT_SETTINGS,
  isDue,
  isStale,
  suggestionKey,
} from '../../src/domain/assistant';
import { AssistantService } from '../../src/services/assistant-service';
import { MatchService } from '../../src/services/match-service';
import { CandidacyService } from '../../src/services/candidacy-service';
import { PlacementService } from '../../src/services/placement-service';
import { ConflictError, NotFoundError } from '../../src/domain/errors';
import type { Candidacy } from '../../src/domain/candidacy';
import type { Mandate } from '../../src/domain/mandate';
import type { Talent } from '../../src/domain/talent';
import { saveDocumentsSchema } from '../../src/domain/talent-documents';
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
} from '../support/fakes';

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
    clock,
    idGenerator: new SequenceIdGenerator('c'),
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
    clock,
    idGenerator: new SequenceIdGenerator('s'),
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
