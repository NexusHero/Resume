import {
  forecastPipeline,
  parseFeeValue,
  STAGE_WIN_PROBABILITY,
} from '../../src/domain/forecast.js';
import { ForecastService } from '../../src/services/forecast-service.js';
import {
  InMemoryMandateRepository,
  InMemoryCandidacyRepository,
  InMemoryStageTransitionRepository,
} from '../support/fakes.js';
import type { Mandate } from '../../src/domain/mandate.js';
import type { Candidacy, CandidacyStage } from '../../src/domain/candidacy.js';

const SCOPE = 'team';

const mandate = (id: string, over: Partial<Mandate> = {}): Mandate => ({
  id,
  ownerId: SCOPE,
  client: 'Acme',
  role: 'Engineer',
  location: 'Berlin',
  fee: '20%',
  feeValue: '10.000 €',
  deadline: '',
  priority: 'medium',
  status: 'active',
  submitted: 0,
  interviews: 0,
  createdAt: '2026-06-25T10:00:00.000Z',
  updatedAt: '2026-06-25T10:00:00.000Z',
  ...over,
});

const candidacy = (id: string, mandateId: string, stage: CandidacyStage): Candidacy => ({
  id,
  ownerId: SCOPE,
  mandateId,
  talentId: `t-${id}`,
  stage,
  order: 0,
  note: '',
  createdAt: '2026-06-25T10:00:00.000Z',
  updatedAt: '2026-06-25T10:00:00.000Z',
});

describe('forecast domain', () => {
  describe('parseFeeValue', () => {
    it('StripsCurrencyAndThousandsDots', () => {
      expect(parseFeeValue('17.160 €')).toBe(17160);
    });
    it('NonNumeric_ReturnsZero', () => {
      expect(parseFeeValue('n/a')).toBe(0);
      expect(parseFeeValue('')).toBe(0);
    });
    it('Nullish_ReturnsZero', () => {
      expect(parseFeeValue(null as unknown as string)).toBe(0);
    });
  });

  it('UnknownStage_TreatedAsZeroProbability', () => {
    const bogus = { ...candidacy('c1', 'm1', 'sourced'), stage: 'weird' as CandidacyStage };
    const f = forecastPipeline([mandate('m1')], new Map([['m1', [bogus]]]));
    expect(f.mandates[0]?.probability).toBe(0);
    expect(f.mandates[0]?.weightedValue).toBe(0);
    expect(f.mandates[0]?.topStage).toBe('weird');
  });

  describe('forecastPipeline', () => {
    it('OmitsMandatesWithoutCandidacies', () => {
      const f = forecastPipeline([mandate('m1')], new Map());
      expect(f.mandates).toEqual([]);
      expect(f.totalWeighted).toBe(0);
      expect(f.totalFaceValue).toBe(0);
    });

    it('WeightsSingleCandidateByStageProbability', () => {
      const by = new Map([['m1', [candidacy('c1', 'm1', 'interview')]]]);
      const f = forecastPipeline([mandate('m1', { feeValue: '10.000 €' })], by);
      expect(f.mandates).toHaveLength(1);
      expect(f.mandates[0]?.probability).toBe(STAGE_WIN_PROBABILITY.interview); // 0.4
      expect(f.mandates[0]?.weightedValue).toBe(4000); // 10000 × 0.4
      expect(f.mandates[0]?.topStage).toBe('interview');
      expect(f.totalWeighted).toBe(4000);
      expect(f.totalFaceValue).toBe(10000);
    });

    it('CombinesCandidatesAsProbabilityOfAtLeastOneFill', () => {
      // two 'screening' (0.15) candidates → 1 − 0.85² = 0.2775, rounded to 0.28
      const by = new Map([
        ['m1', [candidacy('c1', 'm1', 'screening'), candidacy('c2', 'm1', 'screening')]],
      ]);
      const f = forecastPipeline([mandate('m1', { feeValue: '10.000 €' })], by);
      expect(f.mandates[0]?.probability).toBe(0.28);
      expect(f.mandates[0]?.weightedValue).toBe(2775); // weighted uses the unrounded prob
      expect(f.mandates[0]?.candidacies).toBe(2);
    });

    it('PlacedCandidate_GivesFullFeeAndTopStagePlaced', () => {
      const by = new Map([
        ['m1', [candidacy('c1', 'm1', 'sourced'), candidacy('c2', 'm1', 'placed')]],
      ]);
      const f = forecastPipeline([mandate('m1', { feeValue: '12.000 €' })], by);
      expect(f.mandates[0]?.probability).toBe(1);
      expect(f.mandates[0]?.weightedValue).toBe(12000);
      expect(f.mandates[0]?.topStage).toBe('placed');
    });

    it('SortsByWeightedValueDescending', () => {
      const by = new Map([
        ['m1', [candidacy('c1', 'm1', 'sourced')]], // 0.05 × 10000 = 500
        ['m2', [candidacy('c2', 'm2', 'offer')]], // 0.70 × 10000 = 7000
      ]);
      const f = forecastPipeline([mandate('m1'), mandate('m2', { client: 'Beta' })], by);
      expect(f.mandates.map((m) => m.mandateId)).toEqual(['m2', 'm1']);
      expect(f.totalWeighted).toBe(7500);
    });
  });
});

describe('ForecastService', () => {
  function ctx() {
    const mandates = new InMemoryMandateRepository();
    const candidacies = new InMemoryCandidacyRepository();
    const transitions = new InMemoryStageTransitionRepository();
    const service = new ForecastService({
      mandateRepository: mandates,
      candidacyRepository: candidacies,
      stageTransitionRepository: transitions,
    });
    return { service, mandates, candidacies, transitions };
  }

  it('Forecast_ExcludesClosedMandates', async () => {
    const c = ctx();
    await c.mandates.add(mandate('m1', { status: 'active' }));
    await c.mandates.add(mandate('m2', { status: 'closed' }));
    await c.candidacies.add(candidacy('c1', 'm1', 'offer'));
    await c.candidacies.add(candidacy('c2', 'm2', 'offer'));
    const f = await c.service.forecast(SCOPE);
    expect(f.mandates.map((m) => m.mandateId)).toEqual(['m1']);
  });

  it('Forecast_EmptyPipeline_ZeroTotals', async () => {
    const c = ctx();
    await c.mandates.add(mandate('m1'));
    const f = await c.service.forecast(SCOPE);
    expect(f).toEqual({
      totalWeighted: 0,
      totalFaceValue: 0,
      mandates: [],
      probabilities: expect.any(Array),
      insights: [],
    });
    // v2: without history every stage keeps its transparent default
    expect(f.probabilities.every((p) => p.source === 'default')).toBe(true);
  });

  it('ForecastV2_EnoughHistory_UsesTheDeskCurve', async () => {
    const c = ctx();
    await c.mandates.add(mandate('m1', { feeValue: '10.000 €' }));
    await c.candidacies.add(candidacy('open1', 'm1', 'offer'));
    // 5 resolved journeys through offer, all placed → observed p(offer)=1
    for (let i = 0; i < 5; i++) {
      const cid = `hist${i}`;
      await c.transitions.add({
        id: `${cid}-a`,
        ownerId: SCOPE,
        candidacyId: cid,
        mandateId: 'm1',
        talentId: cid,
        from: null,
        to: 'offer',
        at: `2026-06-0${i + 1}T10:00:00.000Z`,
      });
      await c.transitions.add({
        id: `${cid}-b`,
        ownerId: SCOPE,
        candidacyId: cid,
        mandateId: 'm1',
        talentId: cid,
        from: 'offer',
        to: 'placed',
        at: `2026-06-0${i + 1}T11:00:00.000Z`,
      });
    }
    const f = await c.service.forecast(SCOPE);
    const offer = f.probabilities.find((p) => p.stage === 'offer')!;
    expect(offer).toMatchObject({ source: 'observed', probability: 1, sample: 5, wins: 5 });
    // the open offer-stage candidacy is now weighted with the observed 1.0
    expect(f.mandates[0]?.probability).toBe(1);
    expect(f.mandates[0]?.weightedValue).toBe(10000);
  });

  it('ForecastV2_ReportsClientInterviewInsights', async () => {
    const c = ctx();
    await c.mandates.add(mandate('m1', { client: 'Acme' }));
    for (let i = 0; i < 3; i++) {
      const cid = `j${i}`;
      await c.transitions.add({
        id: `${cid}-a`,
        ownerId: SCOPE,
        candidacyId: cid,
        mandateId: 'm1',
        talentId: cid,
        from: null,
        to: 'interview',
        at: `2026-06-0${i + 1}T10:00:00.000Z`,
      });
      await c.transitions.add({
        id: `${cid}-b`,
        ownerId: SCOPE,
        candidacyId: cid,
        mandateId: 'm1',
        talentId: cid,
        from: 'interview',
        to: i === 0 ? 'placed' : 'rejected',
        at: `2026-06-0${i + 1}T11:00:00.000Z`,
      });
    }
    const f = await c.service.forecast(SCOPE);
    expect(f.insights).toEqual([{ client: 'Acme', interviews: 3, placements: 1, rate: 33 }]);
  });
});
