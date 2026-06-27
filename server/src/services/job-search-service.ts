import { type CandidateProfile, scoreJob } from '../domain/skill';
import type { Job, JobQuery, JobSearchResult, ScoredJob } from '../domain/job';
import type { JobSource } from '../ports/job-source';
import type { Logger } from '../ports/logger';

export interface JobSearchServiceDeps {
  jobSource: JobSource;
  candidateProfile: CandidateProfile;
  logger: Logger;
}

/**
 * Runs a job search, scores every posting against the candidate's skills and
 * splits the results into two tiers: strong fits (>= threshold) and everything
 * else. The lower tier is deliberately kept — those are stretch / new-domain
 * roles, not noise — so the candidate sees the right jobs first without losing
 * sight of where they could grow.
 */
export class JobSearchService {
  private readonly source: JobSource;
  private readonly profile: CandidateProfile;
  private readonly logger: Logger;

  constructor(deps: JobSearchServiceDeps) {
    this.source = deps.jobSource;
    this.profile = deps.candidateProfile;
    this.logger = deps.logger;
  }

  async search(query: JobQuery): Promise<JobSearchResult> {
    const jobs = await this.source.search(query);
    const scored = jobs.map((job) => this.score(job)).sort((a, b) => b.match - a.match);

    const top = scored.filter((j) => j.match >= query.threshold);
    const more = scored.filter((j) => j.match < query.threshold);

    this.logger.info(
      { q: query.q ?? '', total: scored.length, top: top.length, threshold: query.threshold },
      'job search',
    );

    return {
      query,
      threshold: query.threshold,
      top,
      more,
      counts: { total: scored.length, top: top.length, more: more.length },
    };
  }

  private score(job: Job): ScoredJob {
    const { score, matched, missing } = scoreJob(this.profile, job.skills);
    return { ...job, match: score, matchedSkills: matched, missingSkills: missing };
  }
}
