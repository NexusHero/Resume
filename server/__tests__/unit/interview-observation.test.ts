import {
  aggregateObservations,
  applyObserved,
  companyKeyOf,
  observedConfidence,
  createObservationSchema,
  type InterviewObservation,
} from '../../src/domain/interview-observation';
import { companyInterviewProfile } from '../../src/domain/company-archetype';

const obs = (over: Partial<InterviewObservation> = {}): InterviewObservation => ({
  id: 'o1',
  ownerId: 'team',
  companyKey: 'google',
  company: 'Google',
  mandateId: 'm1',
  talentId: 't1',
  rounds: 4,
  formats: ['coding'],
  difficulty: 'high',
  notes: '',
  at: '2026-07-01T10:00:00.000Z',
  ...over,
});

describe('interview-observation domain', () => {
  describe('companyKeyOf', () => {
    it('NormalizesLegalFormAndPunctuation', () => {
      expect(companyKeyOf('TRUMPF SE + Co. KG')).toBe('trumpf');
      expect(companyKeyOf('Google Germany GmbH')).toBe('google germany');
      expect(companyKeyOf('Mercedes-Benz AG')).toBe('mercedes benz');
    });
    it('EmptyInput_ReturnsEmpty', () => {
      expect(companyKeyOf('')).toBe('');
    });
  });

  describe('observedConfidence', () => {
    it('GrowsWithSampleSize', () => {
      expect(observedConfidence(1)).toBe('low');
      expect(observedConfidence(3)).toBe('medium');
      expect(observedConfidence(6)).toBe('high');
    });
  });

  describe('aggregateObservations', () => {
    it('EmptyList_ReturnsNull', () => {
      expect(aggregateObservations([])).toBeNull();
    });

    it('AggregatesFormatsRoundsDifficultyAndConfidence', () => {
      const a = aggregateObservations([
        obs({ formats: ['coding', 'system_design'], rounds: 5, difficulty: 'high' }),
        obs({ formats: ['coding', 'behavioral'], rounds: 4, difficulty: 'high' }),
        obs({ formats: ['coding'], rounds: 4, difficulty: 'medium' }),
      ])!;
      expect(a.sampleSize).toBe(3);
      expect(a.confidence).toBe('medium'); // 3 samples
      expect(a.formats[0]?.format).toBe('coding'); // most-seen first
      expect(a.formats[0]?.count).toBe(3);
      expect(a.typicalRounds).toBe(4); // median of [4,4,5]
      expect(a.difficulty).toBe('high'); // mode
    });

    it('EvenCount_MediansRounds', () => {
      const a = aggregateObservations([obs({ rounds: 2 }), obs({ rounds: 5 })])!;
      expect(a.typicalRounds).toBe(4); // round((2+5)/2)
    });
  });

  describe('applyObserved', () => {
    it('NullObserved_ReturnsBaseUnchanged', () => {
      const base = companyInterviewProfile('Google', 'Engineer');
      expect(applyObserved(base, null)).toBe(base);
    });

    it('ObservedOverridesSourceConfidenceAndLeadsFormats', () => {
      const base = companyInterviewProfile('Some Startup', 'Engineer'); // default archetype
      const observed = aggregateObservations([
        obs({ companyKey: 'some startup', formats: ['case'], rounds: 2, difficulty: 'medium' }),
        obs({ companyKey: 'some startup', formats: ['case'], rounds: 2, difficulty: 'medium' }),
        obs({ companyKey: 'some startup', formats: ['case'], rounds: 2, difficulty: 'medium' }),
      ]);
      const merged = applyObserved(base, observed);
      expect(merged.source).toBe('observed');
      expect(merged.confidence).toBe('medium');
      expect(merged.style.formats[0]).toBe('Case-Interview'); // observed leads
      expect(merged.style.rounds).toContain('3 Beobachtungen');
    });

    it('SingleObservation_UsesSingularWording', () => {
      const base = companyInterviewProfile('X', 'Engineer');
      const merged = applyObserved(base, aggregateObservations([obs({ companyKey: 'x' })]));
      expect(merged.style.rounds).toContain('1 Beobachtung)');
      expect(merged.confidence).toBe('low');
    });
  });

  describe('createObservationSchema', () => {
    it('AppliesDefaults', () => {
      expect(createObservationSchema.parse({})).toEqual({
        talentId: '',
        rounds: 1,
        formats: [],
        difficulty: 'medium',
        notes: '',
      });
    });
    it('RejectsUnknownFormat', () => {
      expect(() => createObservationSchema.parse({ formats: ['nope'] })).toThrow();
    });
  });
});
