import { JobSearchService } from '../../src/services/job-search-service.js';
import { AllJobSourcesFailedError } from '../../src/ports/job-source.js';
import { jobQuerySchema, type Job } from '../../src/domain/job.js';
import type { JobSource } from '../../src/ports/job-source.js';
import type { CandidateProfile } from '../../src/domain/skill.js';
import { KeywordSkillExtractor } from '../../src/adapters/keyword-skill-extractor.js';
import { noopLogger, noopSkillExtractor } from '../support/fakes.js';

class StubJobSource implements JobSource {
  readonly name = 'Stub';
  constructor(private readonly jobs: Job[]) {}
  async search(): Promise<Job[]> {
    return this.jobs.map((j) => ({ ...j }));
  }
}

const profile: CandidateProfile = {
  skills: [
    { name: 'C++', weight: 3 },
    { name: 'gRPC', weight: 2 },
  ],
};

function job(id: string, skills: string[]): Job {
  return {
    id,
    company: id,
    role: id,
    city: 'Berlin',
    country: 'DE',
    mode: 'remote',
    skills,
    source: 'Stub',
  };
}

function makeService(jobs: Job[]): JobSearchService {
  return new JobSearchService({
    jobSource: new StubJobSource(jobs),
    skillExtractor: noopSkillExtractor,
    candidateProfile: profile,
    logger: noopLogger,
  });
}

describe('JobSearchService.search', () => {
  it('Search_SplitsAtThresholdAndSortsBestFirst', async () => {
    const service = makeService([
      job('weak', ['Kotlin']), // 0
      job('strong', ['C++', 'gRPC']), // 100
      job('mid', ['C++', 'Rust']), // 75
    ]);
    const result = await service.search(jobQuerySchema.parse({ threshold: 80 }));

    expect(result.top.map((j) => j.id)).toEqual(['strong']);
    expect(result.more.map((j) => j.id)).toEqual(['mid', 'weak']); // sorted desc within tier
    expect(result.counts).toEqual({ total: 3, top: 1, more: 2 });
  });

  it('Search_KeepsLowMatchesAsStretchOpportunities', async () => {
    const service = makeService([job('newdomain', ['Haskell', 'Elixir'])]);
    const result = await service.search(jobQuerySchema.parse({}));
    // not dropped — surfaced in the lower tier with the new skills it would add
    expect(result.more).toHaveLength(1);
    expect(result.more[0]?.missingSkills).toEqual(['Haskell', 'Elixir']);
  });

  it('Search_TaglessJob_IsEnrichedBySkillExtraction', async () => {
    // a posting with no structured skills, but the text names them
    const tagless: Job = {
      id: 'ba1',
      company: 'Acme',
      role: 'Senior C++ Engineer',
      city: 'Berlin',
      country: 'DE',
      mode: '',
      skills: [],
      snippet: 'Work on gRPC services and distributed systems.',
      source: 'Stub',
    };
    const service = new JobSearchService({
      jobSource: new StubJobSource([tagless]),
      skillExtractor: new KeywordSkillExtractor(),
      candidateProfile: profile, // has C++ (3) and gRPC (2)
      logger: noopLogger,
    });
    const result = await service.search(jobQuerySchema.parse({}));
    const job = [...result.top, ...result.more][0];
    expect(job?.skills).toEqual(expect.arrayContaining(['C++', 'gRPC', 'Distributed Systems']));
    expect(job?.matchedSkills).toEqual(expect.arrayContaining(['C++', 'gRPC']));
    // C++(3) + gRPC(2) covered; Distributed Systems missing (default weight 1) → 5/6 = 83
    expect(job?.match).toBe(83);
    expect(job?.missingSkills).toEqual(['Distributed Systems']);
  });

  it('Search_BoundaryIsInclusive', async () => {
    const service = makeService([job('exactly80', ['C++', 'gRPC', 'Rust', 'Go', 'Java'])]);
    // covered 5 / total 7 = 71 → below 70 boundary? compute: weights C++3 gRPC2 =5 covered; missing Rust,Go,Java =3 → 5/8=63
    const result = await service.search(jobQuerySchema.parse({ threshold: 63 }));
    expect(result.top.map((j) => j.id)).toEqual(['exactly80']);
  });
});

describe('JobSearchService live-source outage', () => {
  it('Search_AllLiveSourcesDown_ReturnsEmptyAndFlagsIt', async () => {
    // Regression: production must NOT fall back to fabricated sample postings.
    // An outage yields an empty list plus liveSourcesDown so the UI can explain
    // it — never mock data.
    const service = new JobSearchService({
      jobSource: {
        name: 'composite',
        search: async () => {
          throw new AllJobSourcesFailedError(['Arbeitnow']);
        },
      },
      skillExtractor: new KeywordSkillExtractor(),
      candidateProfile: { skills: [{ name: 'React', weight: 3 }] },
      logger: noopLogger,
    });
    const result = await service.search({ threshold: 80 });
    expect(result.source).toBe('composite');
    expect(result.liveSourcesDown).toBe(true);
    expect(result.counts.total).toBe(0);
    expect(result.top).toEqual([]);
    expect(result.more).toEqual([]);
  });

  it('Search_OtherErrors_StillPropagate', async () => {
    const service = new JobSearchService({
      jobSource: {
        name: 'composite',
        search: async () => {
          throw new Error('unexpected');
        },
      },
      skillExtractor: new KeywordSkillExtractor(),
      candidateProfile: { skills: [] },
      logger: noopLogger,
    });
    await expect(service.search({ threshold: 80 })).rejects.toThrow('unexpected');
  });
});

describe('JobSearchService per-source counts', () => {
  it('Search_DetailedSource_SurfacesPerSourceOutcomes', async () => {
    const service = new JobSearchService({
      jobSource: {
        name: 'composite',
        search: async () => [job('a', [])],
        // A detailed source reports each board's contribution + health.
        searchDetailed: async () => ({
          jobs: [job('a', ['C++']), job('b', [])],
          sources: [
            { name: 'Arbeitnow', count: 1, ok: true },
            { name: 'Remotive', count: 1, ok: true },
            { name: 'Adzuna', count: 0, ok: false },
          ],
        }),
      },
      skillExtractor: noopSkillExtractor,
      candidateProfile: profile,
      logger: noopLogger,
    });
    const result = await service.search(jobQuerySchema.parse({}));
    expect(result.sources).toEqual([
      { name: 'Arbeitnow', count: 1, ok: true },
      { name: 'Remotive', count: 1, ok: true },
      { name: 'Adzuna', count: 0, ok: false },
    ]);
    expect(result.counts.total).toBe(2);
  });
});
