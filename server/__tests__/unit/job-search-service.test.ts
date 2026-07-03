import { JobSearchService } from '../../src/services/job-search-service';
import { AllJobSourcesFailedError } from '../../src/ports/job-source';
import { SampleJobSource } from '../../src/adapters/sample-job-source';
import { jobQuerySchema, type Job } from '../../src/domain/job';
import type { JobSource } from '../../src/ports/job-source';
import type { CandidateProfile } from '../../src/domain/skill';
import { KeywordSkillExtractor } from '../../src/adapters/keyword-skill-extractor';
import { noopLogger, noopSkillExtractor } from '../support/fakes';

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
    fallbackJobSource: new SampleJobSource(),
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
      fallbackJobSource: new SampleJobSource(),
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

describe('JobSearchService live-source fallback', () => {
  it('Search_AllLiveSourcesDown_ServesSampleAndSaysSo', async () => {
    const service = new JobSearchService({
      jobSource: {
        name: 'composite',
        search: async () => {
          throw new AllJobSourcesFailedError(['Arbeitnow']);
        },
      },
      fallbackJobSource: new SampleJobSource(),
      skillExtractor: new KeywordSkillExtractor(),
      candidateProfile: { skills: [{ name: 'React', weight: 3 }] },
      logger: noopLogger,
    });
    const result = await service.search({ threshold: 80 });
    expect(result.source).toBe('Sample');
    expect(result.liveSourcesDown).toBe(true);
    expect(result.counts.total).toBeGreaterThan(0); // the sample still ranks
  });

  it('Search_OtherErrors_StillPropagate', async () => {
    const service = new JobSearchService({
      jobSource: {
        name: 'composite',
        search: async () => {
          throw new Error('unexpected');
        },
      },
      fallbackJobSource: new SampleJobSource(),
      skillExtractor: new KeywordSkillExtractor(),
      candidateProfile: { skills: [] },
      logger: noopLogger,
    });
    await expect(service.search({ threshold: 80 })).rejects.toThrow('unexpected');
  });
});
