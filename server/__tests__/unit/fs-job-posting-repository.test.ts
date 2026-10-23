import { promises as fs } from 'node:fs';
import { mkdtempSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { AppConfig } from '../../src/config.js';
import type { JobPosting } from '../../src/domain/job-posting.js';
import { normalizeUrl } from '../../src/domain/job-posting.js';
import { FsJobPostingRepository } from '../../src/adapters/fs-job-posting-repository.js';

function tmpConfig(): AppConfig {
  const rootDir = mkdtempSync(path.join(os.tmpdir(), 'job-postings-'));
  const storeDir = path.join(rootDir, 'bewerbungen');
  return { jobPostingsFile: path.join(storeDir, 'job-postings.json') } as AppConfig;
}

const posting = (id: string, ownerId = 'team', over: Partial<JobPosting> = {}): JobPosting => ({
  id,
  ownerId,
  source: 'Arbeitnow',
  sourceId: `src-${id}`,
  url: `https://example.com/${id}`,
  company: 'Acme',
  title: 'Engineer',
  location: 'Berlin',
  country: 'DE',
  description: 'Full ad text.',
  requirements: ['Rust'],
  descriptionIncomplete: false,
  createdAt: '2026-06-25T10:00:00.000Z',
  ...over,
});

describe('FsJobPostingRepository', () => {
  it('List_FiltersByOwner', async () => {
    const repo = new FsJobPostingRepository({ config: tmpConfig() });
    await repo.add(posting('p1', 'team'));
    await repo.add(posting('p2', 'other'));
    expect((await repo.list('team')).map((p) => p.id)).toEqual(['p1']);
  });

  it('TwoWorkspaces_AreIsolated', async () => {
    const repo = new FsJobPostingRepository({ config: tmpConfig() });
    await repo.add(posting('p1', 'team'));
    await repo.add(posting('p2', 'other'));
    expect(await repo.findById('team', 'p2')).toBeNull();
    expect(await repo.findById('other', 'p1')).toBeNull();
    expect(await repo.findDuplicate('team', 'Arbeitnow', 'src-p2', undefined)).toBeNull();
    expect(await repo.delete('other', 'p1')).toBe(false);
  });

  it('FindDuplicate_SameUrlDifferentSource_ReturnsExisting', async () => {
    const repo = new FsJobPostingRepository({ config: tmpConfig() });
    await repo.add(
      posting('p1', 'team', { source: 'A', sourceId: undefined, url: 'https://x.test/job' }),
    );
    const existing = await repo.findDuplicate('team', 'B', undefined, 'https://x.test/job');
    expect(existing?.id).toBe('p1');
  });

  it('FindDuplicate_HostCaseTrailingSlash_ReturnsExisting', async () => {
    const repo = new FsJobPostingRepository({ config: tmpConfig() });
    // The service normalises once before persisting; the adapter compares raw.
    const normalized = normalizeUrl('https://Example.com/job/');
    expect(normalized).toBe('https://example.com/job');
    await repo.add(posting('p1', 'team', { sourceId: undefined, url: normalized }));
    expect(await repo.findDuplicate('team', 'url', undefined, normalized)).toMatchObject({
      id: 'p1',
    });
    // A non-normalised variant does NOT match (raw comparison in the adapter).
    expect(
      await repo.findDuplicate('team', 'url', undefined, 'https://Example.com/job/'),
    ).toBeNull();
  });

  it('CorruptFile_ReturnsEmpty', async () => {
    const config = tmpConfig();
    await fs.mkdir(path.dirname(config.jobPostingsFile), { recursive: true });
    await fs.writeFile(config.jobPostingsFile, 'not json');
    const repo = new FsJobPostingRepository({ config });
    expect(await repo.list('team')).toEqual([]);
    await fs.writeFile(config.jobPostingsFile, '{"x":1}');
    expect(await repo.list('team')).toEqual([]);
  });

  it('ConcurrentWrites_AreSerialized', async () => {
    const config = tmpConfig();
    const repo = new FsJobPostingRepository({ config });
    await Promise.all(Array.from({ length: 25 }, (_, i) => repo.add(posting(`p${i}`, 'team'))));
    expect(await repo.list('team')).toHaveLength(25);
  });

  it('AddFindUpdateDelete_RoundTrips', async () => {
    const repo = new FsJobPostingRepository({ config: tmpConfig() });
    await repo.add(posting('p1'));
    expect(await repo.findById('team', 'p1')).toMatchObject({ id: 'p1', company: 'Acme' });
    await repo.update(posting('p1', 'team', { company: 'New' }));
    expect((await repo.findById('team', 'p1'))?.company).toBe('New');
    expect(await repo.delete('team', 'p1')).toBe(true);
    expect(await repo.delete('team', 'p1')).toBe(false);
  });
});
