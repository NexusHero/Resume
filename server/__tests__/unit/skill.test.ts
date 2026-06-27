import { normalizeSkill, scoreJob, type CandidateProfile } from '../../src/domain/skill';

const profile: CandidateProfile = {
  skills: [
    { name: 'C++', weight: 3 },
    { name: 'gRPC', weight: 2 },
    { name: 'Go' }, // default weight 1
  ],
};

describe('normalizeSkill', () => {
  it.each([
    ['Node.js', 'node.js'],
    ['  Rust ', 'rust'],
    ['C++', 'c++'],
  ])('Normalize_%s_LowercasesAndTrims', (input, expected) => {
    expect(normalizeSkill(input)).toBe(expected);
  });
});

describe('scoreJob', () => {
  it('ScoreJob_AllCovered_Returns100', () => {
    const res = scoreJob(profile, ['C++', 'gRPC']);
    expect(res.score).toBe(100);
    expect(res.matched).toEqual(['C++', 'gRPC']);
    expect(res.missing).toEqual([]);
  });

  it('ScoreJob_PartialCover_IsWeighted', () => {
    // have C++(3); missing Rust(1) → 3 / (3+1) = 75
    const res = scoreJob(profile, ['C++', 'Rust']);
    expect(res.score).toBe(75);
    expect(res.matched).toEqual(['C++']);
    expect(res.missing).toEqual(['Rust']);
  });

  it('ScoreJob_CaseInsensitiveMatch', () => {
    const res = scoreJob(profile, ['c++']);
    expect(res.score).toBe(100);
    expect(res.matched).toEqual(['c++']);
  });

  it('ScoreJob_NoneCovered_ScoresLowAndListsMissing', () => {
    const res = scoreJob(profile, ['Kotlin', 'Swift']);
    expect(res.score).toBe(0);
    expect(res.missing).toEqual(['Kotlin', 'Swift']);
  });

  it('ScoreJob_EmptyRequirements_IsNeutralFullMatch', () => {
    expect(scoreJob(profile, []).score).toBe(100);
  });

  it('ScoreJob_DuplicateAndBlankSkills_AreIgnored', () => {
    const res = scoreJob(profile, ['C++', 'C++', '  ']);
    expect(res.score).toBe(100);
    expect(res.matched).toEqual(['C++']);
  });
});
