import { analyzeGap, atsRequestSchema } from '../../src/domain/ats';
import { AtsService } from '../../src/services/ats-service';
import type { CandidateProfile } from '../../src/domain/skill';
import { KeywordSkillExtractor } from '../../src/adapters/keyword-skill-extractor';

const profile: CandidateProfile = {
  skills: [
    { name: 'C++', weight: 3 },
    { name: 'gRPC', weight: 2 },
  ],
};

describe('analyzeGap', () => {
  it('Analyze_PartialCoverage_ListsMatchedMissingAndRecommendations', () => {
    const report = analyzeGap(profile, ['C++', 'Kotlin', 'gRPC']);
    expect(report.matched).toEqual(['C++', 'gRPC']);
    expect(report.missing).toEqual(['Kotlin']);
    expect(report.requiredSkills).toEqual(['C++', 'gRPC', 'Kotlin']);
    expect(report.recommendations).toHaveLength(1);
    expect(report.recommendations[0]).toContain('Kotlin');
    // C++(3)+gRPC(2) covered, Kotlin(1) missing → 5/6 = 83
    expect(report.score).toBe(83);
  });

  it('Analyze_FullCoverage_NoRecommendations', () => {
    const report = analyzeGap(profile, ['C++', 'gRPC']);
    expect(report.score).toBe(100);
    expect(report.missing).toEqual([]);
    expect(report.recommendations).toEqual([]);
  });
});

describe('atsRequestSchema', () => {
  it('Schema_AllEmpty_Rejected', () => {
    expect(atsRequestSchema.safeParse({}).success).toBe(false);
    expect(atsRequestSchema.safeParse({ skills: [] }).success).toBe(false);
  });
  it('Schema_AnyFieldPresent_Accepted', () => {
    expect(atsRequestSchema.safeParse({ text: 'x' }).success).toBe(true);
    expect(atsRequestSchema.safeParse({ role: 'x' }).success).toBe(true);
    expect(atsRequestSchema.safeParse({ skills: ['x'] }).success).toBe(true);
  });
});

describe('AtsService', () => {
  const service = new AtsService({
    skillExtractor: new KeywordSkillExtractor(),
    candidateProfile: profile,
  });

  it('Analyze_UnionsDeclaredAndExtractedSkills', () => {
    const report = service.analyze({
      role: 'Senior C++ Engineer',
      text: 'You will use gRPC and Kotlin daily.',
      skills: ['Docker'],
    });
    // declared Docker + extracted C++, gRPC, Kotlin
    expect(report.requiredSkills).toEqual(
      expect.arrayContaining(['Docker', 'C++', 'gRPC', 'Kotlin']),
    );
    expect(report.matched).toEqual(expect.arrayContaining(['C++', 'gRPC']));
    expect(report.missing).toEqual(expect.arrayContaining(['Docker', 'Kotlin']));
  });

  it('Analyze_SkillsOnly_NoRoleOrText', () => {
    const report = service.analyze({ skills: ['C++', 'Docker'] });
    expect(report.matched).toEqual(['C++']);
    expect(report.missing).toEqual(['Docker']);
  });
});
