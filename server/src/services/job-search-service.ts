import { type CandidateProfile, scoreJob, unionSkills } from '../domain/skill.js';
import type { Job, JobQuery, JobSearchResult, JobSourceOutcome, ScoredJob } from '../domain/job.js';
import { AllJobSourcesFailedError, type JobSource } from '../ports/job-source.js';
import type { CompositeSearchOutcome } from '../adapters/composite-job-source.js';
import type { SkillExtractor } from '../ports/skill-extractor.js';
import type { Logger } from '../ports/logger.js';

/** A source that can also report its per-board breakdown (the composite). */
interface DetailedJobSource extends JobSource {
  searchDetailed(query: JobQuery): Promise<CompositeSearchOutcome>;
}

function isDetailed(source: JobSource): source is DetailedJobSource {
  return typeof (source as Partial<DetailedJobSource>).searchDetailed === 'function';
}

export interface JobSearchServiceDeps {
  jobSource: JobSource;
  skillExtractor: SkillExtractor;
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
  private readonly extractor: SkillExtractor;
  private readonly profile: CandidateProfile;
  private readonly logger: Logger;

  constructor(deps: JobSearchServiceDeps) {
    this.source = deps.jobSource;
    this.extractor = deps.skillExtractor;
    this.profile = deps.candidateProfile;
    this.logger = deps.logger;
  }

  async search(query: JobQuery): Promise<JobSearchResult> {
    // When every configured live source fails (network blocked, APIs down,
    // bad keys) the search returns an empty list AND flags liveSourcesDown, so
    // the UI can explain the outage. There is deliberately no fabricated sample
    // fallback — production must never show mock postings.
    let jobs: Job[];
    let sources: JobSourceOutcome[] = [];
    const source = this.source.name;
    let liveSourcesDown = false;
    try {
      if (isDetailed(this.source)) {
        const outcome = await this.source.searchDetailed(query);
        jobs = outcome.jobs;
        sources = outcome.sources;
      } else {
        jobs = await this.source.search(query);
      }
    } catch (err) {
      if (!(err instanceof AllJobSourcesFailedError)) throw err;
      this.logger.warn({ sources: err.sources }, 'all live job sources failed — no postings');
      jobs = [];
      // Every source failed → report each as contributing 0, so the UI can show
      // which boards are down rather than a bare "0 results".
      sources = err.sources.map((name) => ({ name, count: 0, ok: false }));
      liveSourcesDown = true;
    }
    const scored = jobs.map((job) => this.score(job)).sort((a, b) => b.match - a.match);

    const top = scored.filter((j) => j.match >= query.threshold);
    const more = scored.filter((j) => j.match < query.threshold);

    this.logger.info(
      {
        q: query.q ?? '',
        total: scored.length,
        top: top.length,
        threshold: query.threshold,
        sources: sources.map((s) => `${s.name}:${s.ok ? s.count : 'down'}`),
      },
      'job search',
    );

    return {
      query,
      threshold: query.threshold,
      source,
      ...(liveSourcesDown ? { liveSourcesDown } : {}),
      sources,
      top,
      more,
      counts: { total: scored.length, top: top.length, more: more.length },
    };
  }

  private score(job: Job): ScoredJob {
    // Enrich the posting's tags with skills detected in its title + description,
    // so jobs that arrive without structured tags can still be matched.
    const detected = this.extractor.extract(`${job.role} ${job.snippet ?? ''}`);
    const skills = unionSkills(job.skills, detected);
    const { score, matched, missing } = scoreJob(this.profile, skills);
    return { ...job, skills, match: score, matchedSkills: matched, missingSkills: missing };
  }
}
