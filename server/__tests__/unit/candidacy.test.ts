import {
  CANDIDACY_STAGES,
  addCandidacySchema,
  updateCandidacySchema,
} from '../../src/domain/candidacy';

describe('candidacy domain', () => {
  it('AddCandidacy_AppliesDefaults', () => {
    const parsed = addCandidacySchema.parse({ talentId: 't1' });
    expect(parsed.stage).toBe('sourced');
    expect(parsed.note).toBe('');
  });

  it('AddCandidacy_RequiresTalentId', () => {
    expect(addCandidacySchema.safeParse({}).success).toBe(false);
    expect(addCandidacySchema.safeParse({ talentId: '' }).success).toBe(false);
  });

  it('AddCandidacy_RejectsUnknownStage', () => {
    expect(addCandidacySchema.safeParse({ talentId: 't1', stage: 'nope' }).success).toBe(false);
  });

  it('UpdateCandidacy_AllFieldsOptional', () => {
    expect(updateCandidacySchema.parse({})).toEqual({});
    expect(updateCandidacySchema.parse({ stage: 'interview' })).toEqual({ stage: 'interview' });
    expect(updateCandidacySchema.safeParse({ order: -1 }).success).toBe(false);
  });

  it('Stages_CoverTheFullFunnel', () => {
    expect(CANDIDACY_STAGES).toEqual([
      'sourced',
      'screening',
      'interview',
      'offer',
      'placed',
      'rejected',
    ]);
  });
});
