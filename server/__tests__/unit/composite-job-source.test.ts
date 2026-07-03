import { CompositeJobSource } from '../../src/adapters/composite-job-source';
import type { Job, JobQuery } from '../../src/domain/job';
import { AllJobSourcesFailedError, type JobSource } from '../../src/ports/job-source';
import { noopLogger } from '../support/fakes';

function stub(name: string, jobs: Job[]): JobSource {
  return { name, search: async () => jobs };
}
function failing(name: string): JobSource {
  return {
    name,
    search: async () => {
      throw new Error('boom');
    },
  };
}
function job(source: string, id: string): Job {
  return { id, company: 'C', role: 'R', city: '', country: '', mode: '', skills: [], source };
}

const anyQuery: JobQuery = { threshold: 80 };

describe('CompositeJobSource', () => {
  it('Search_MergesAllSources', async () => {
    const c = new CompositeJobSource(
      [stub('A', [job('A', '1')]), stub('B', [job('B', '2')])],
      noopLogger,
    );
    const jobs = await c.search(anyQuery);
    expect(jobs.map((j) => `${j.source}:${j.id}`)).toEqual(['A:1', 'B:2']);
  });

  it('Search_DedupesBySourceAndId', async () => {
    const c = new CompositeJobSource([stub('A', [job('A', '1'), job('A', '1')])], noopLogger);
    expect(await c.search(anyQuery)).toHaveLength(1);
  });

  it('Search_OneSourceFails_OthersStillReturn', async () => {
    const c = new CompositeJobSource([failing('Down'), stub('B', [job('B', '2')])], noopLogger);
    const jobs = await c.search(anyQuery);
    expect(jobs.map((j) => j.id)).toEqual(['2']);
  });

  it('Search_AllSourcesFail_ThrowsInsteadOfFakingNoHits', async () => {
    const c = new CompositeJobSource([failing('A'), failing('B')], noopLogger);
    await expect(c.search(anyQuery)).rejects.toBeInstanceOf(AllJobSourcesFailedError);
    await expect(c.search(anyQuery)).rejects.toMatchObject({ sources: ['A', 'B'] });
  });

  it('Search_HealthySourceWithZeroHits_IsNotAFailure', async () => {
    // an empty result from a working source is a legitimate "no hits"
    const c = new CompositeJobSource([failing('Down'), stub('B', [])], noopLogger);
    expect(await c.search(anyQuery)).toEqual([]);
  });
});
