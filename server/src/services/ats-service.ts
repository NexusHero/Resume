import { type AtsReport, type AtsRequest, analyzeGap } from '../domain/ats';
import { type CandidateProfile, unionSkills } from '../domain/skill';
import type { SkillExtractor } from '../ports/skill-extractor';

export interface AtsServiceDeps {
  skillExtractor: SkillExtractor;
  candidateProfile: CandidateProfile;
}

/**
 * Builds an ATS gap report from a pasted posting: declared skills are unioned
 * with skills extracted from the role + free text, then compared to the profile.
 */
export class AtsService {
  private readonly extractor: SkillExtractor;
  private readonly profile: CandidateProfile;

  constructor(deps: AtsServiceDeps) {
    this.extractor = deps.skillExtractor;
    this.profile = deps.candidateProfile;
  }

  analyze(input: AtsRequest): AtsReport {
    const detected = this.extractor.extract(`${input.role ?? ''} ${input.text ?? ''}`);
    const required = unionSkills(input.skills ?? [], detected);
    return analyzeGap(this.profile, required);
  }
}
