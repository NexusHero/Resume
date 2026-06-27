import { JobSearchService } from '../../src/services/job-search-service';
import { jobQuerySchema, type Job } from '../../src/domain/job';
import type { JobSource } from '../../src/ports/job-source';
import type { CandidateProfile } from '../../src/domain/skill';
import { noopLogger } from '../support/fakes';

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

  it('Search_BoundaryIsInclusive', async () => {
    const service = makeService([job('exactly80', ['C++', 'gRPC', 'Rust', 'Go', 'Java'])]);
    // covered 5 / total 7 = 71 → below 70 boundary? compute: weights C++3 gRPC2 =5 covered; missing Rust,Go,Java =3 → 5/8=63
    const result = await service.search(jobQuerySchema.parse({ threshold: 63 }));
    expect(result.top.map((j) => j.id)).toEqual(['exactly80']);
  });
});
