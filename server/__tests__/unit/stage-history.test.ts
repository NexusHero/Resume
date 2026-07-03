import { STAGE_WIN_PROBABILITY } from '../../src/domain/forecast';
import {
  clientInsights,
  learnStageProbabilities,
  winProbabilityFrom,
  MIN_SAMPLE,
  type StageTransition,
} from '../../src/domain/stage-history';

let seq = 0;
const t = (
  candidacyId: string,
  from: StageTransition['from'],
  to: StageTransition['to'],
  over: Partial<StageTransition> = {},
): StageTransition => ({
  id: `t${(seq += 1)}`,
  ownerId: 'team',
  candidacyId,
  mandateId: 'm1',
  talentId: `talent-${candidacyId}`,
  from,
  to,
  at: `2026-06-${String(10 + seq).padStart(2, '0')}T10:00:00.000Z`,
  ...over,
});

/** A full journey sourced→…→outcome for one candidacy. */
function journey(id: string, outcome: 'placed' | 'rejected', over: Partial<StageTransition> = {}) {
  return [
    t(id, null, 'sourced', over),
    t(id, 'sourced', 'interview', over),
    t(id, 'interview', outcome, over),
  ];
}

beforeEach(() => {
  seq = 0;
});

describe('learnStageProbabilities', () => {
  it('Learn_NoData_KeepsDefaultsWithZeroSample', () => {
    const learned = learnStageProbabilities([], STAGE_WIN_PROBABILITY);
    expect(learned).toHaveLength(4);
    for (const p of learned) {
      expect(p.source).toBe('default');
      expect(p.sample).toBe(0);
      expect(p.probability).toBe(STAGE_WIN_PROBABILITY[p.stage]);
    }
  });

  it('Learn_BelowMinSample_StaysDefaultButReportsEvidence', () => {
    // MIN_SAMPLE - 1 resolved journeys through interview: not enough to trust.
    const transitions = Array.from({ length: MIN_SAMPLE - 1 }, (_, i) =>
      journey(`c${i}`, 'placed'),
    ).flat();
    const learned = learnStageProbabilities(transitions, STAGE_WIN_PROBABILITY);
    const interview = learned.find((p) => p.stage === 'interview')!;
    expect(interview.source).toBe('default');
    expect(interview.sample).toBe(MIN_SAMPLE - 1);
    expect(interview.wins).toBe(MIN_SAMPLE - 1);
    expect(interview.probability).toBe(STAGE_WIN_PROBABILITY.interview);
  });

  it('Learn_EnoughResolvedJourneys_UsesObservedRate', () => {
    // 6 resolved journeys through interview, 3 placed → 0.5 observed.
    const transitions = [
      ...journey('c1', 'placed'),
      ...journey('c2', 'placed'),
      ...journey('c3', 'placed'),
      ...journey('c4', 'rejected'),
      ...journey('c5', 'rejected'),
      ...journey('c6', 'rejected'),
    ];
    const learned = learnStageProbabilities(transitions, STAGE_WIN_PROBABILITY);
    const interview = learned.find((p) => p.stage === 'interview')!;
    expect(interview).toMatchObject({ source: 'observed', sample: 6, wins: 3, probability: 0.5 });
    // sourced was also passed by all six journeys → observed there too
    expect(learned.find((p) => p.stage === 'sourced')).toMatchObject({
      source: 'observed',
      probability: 0.5,
    });
  });

  it('Learn_OpenJourneysNeverCount', () => {
    const transitions = [
      ...journey('c1', 'placed'),
      // five journeys still in flight — no terminal stage reached
      ...Array.from({ length: 5 }, (_, i) => [
        t(`open${i}`, null, 'sourced'),
        t(`open${i}`, 'sourced', 'interview'),
      ]).flat(),
    ];
    const learned = learnStageProbabilities(transitions, STAGE_WIN_PROBABILITY);
    const interview = learned.find((p) => p.stage === 'interview')!;
    expect(interview.sample).toBe(1); // only the resolved one
    expect(interview.source).toBe('default');
  });

  it('Learn_StageSkippedByJourney_NotInItsSample', () => {
    // added directly at interview — never touched screening
    const direct = [t('c1', null, 'interview'), t('c1', 'interview', 'placed')];
    const learned = learnStageProbabilities(direct, STAGE_WIN_PROBABILITY);
    expect(learned.find((p) => p.stage === 'screening')!.sample).toBe(0);
    expect(learned.find((p) => p.stage === 'interview')!.sample).toBe(1);
  });

  it('WinProbabilityFrom_FixesTerminalsAndAppliesLearned', () => {
    const record = winProbabilityFrom(
      learnStageProbabilities([], STAGE_WIN_PROBABILITY).map((p) =>
        p.stage === 'offer' ? { ...p, probability: 0.9 } : p,
      ),
    );
    expect(record.placed).toBe(1);
    expect(record.rejected).toBe(0);
    expect(record.offer).toBe(0.9);
    expect(record.sourced).toBe(STAGE_WIN_PROBABILITY.sourced);
  });
});

describe('clientInsights', () => {
  const clients = new Map([
    ['m1', 'Acme'],
    ['m2', 'Globex'],
  ]);

  it('Insights_RequireMinimumResolvedInterviews', () => {
    // Acme: 3 resolved interviews (2 placed) → reported. Globex: 1 → hidden.
    const transitions = [
      ...journey('a1', 'placed'),
      ...journey('a2', 'placed'),
      ...journey('a3', 'rejected'),
      ...journey('g1', 'rejected', { mandateId: 'm2' }),
    ];
    const insights = clientInsights(transitions, clients);
    expect(insights).toEqual([{ client: 'Acme', interviews: 3, placements: 2, rate: 67 }]);
  });

  it('Insights_JourneysWithoutInterviewOrStillOpen_DoNotCount', () => {
    const transitions = [
      // rejected before any interview
      t('a1', null, 'sourced'),
      t('a1', 'sourced', 'rejected'),
      // interview reached but still open
      t('a2', null, 'interview'),
    ];
    expect(clientInsights(transitions, clients)).toEqual([]);
  });
});
