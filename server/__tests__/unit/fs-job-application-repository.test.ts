import { promises as fs } from 'node:fs';
import { mkdtempSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { AppConfig } from '../../src/config.js';
import type { JobApplication } from '../../src/domain/job-application.js';
import { emptyContact, emptyDocuments } from '../../src/domain/talent-documents.js';
import { FsJobApplicationRepository } from '../../src/adapters/fs-job-application-repository.js';

function tmpConfig(): AppConfig {
  const rootDir = mkdtempSync(path.join(os.tmpdir(), 'job-applications-'));
  const storeDir = path.join(rootDir, 'bewerbungen');
  return { jobApplicationsFile: path.join(storeDir, 'job-applications.json') } as AppConfig;
}

const application = (
  id: string,
  ownerId = 'team',
  over: Partial<JobApplication> = {},
): JobApplication => ({
  id,
  ownerId,
  jobPostingId: 'p1',
  postingCompany: 'Acme',
  postingTitle: 'Engineer',
  talentId: 't1',
  talentName: 'Ada',
  status: 'draft',
  statusHistory: [{ status: 'draft', at: '2026-06-25T10:00:00.000Z' }],
  documents: emptyDocuments(ownerId, 't1', { ...emptyContact }, '2026-06-25T10:00:00.000Z'),
  createdAt: '2026-06-25T10:00:00.000Z',
  updatedAt: '2026-06-25T10:00:00.000Z',
  ...over,
});

describe('FsJobApplicationRepository', () => {
  it('FsJobApplicationRepository_List_FiltersByOwner', async () => {
    const repo = new FsJobApplicationRepository({ config: tmpConfig() });
    await repo.add(application('a1', 'team'));
    await repo.add(application('a2', 'other'));
    expect((await repo.list('team')).map((a) => a.id)).toEqual(['a1']);
    expect((await repo.list('team', 't1')).map((a) => a.id)).toEqual(['a1']);
    expect(await repo.list('team', 'nope')).toEqual([]);
  });

  it('FsJobApplicationRepository_FindByPostingAndTalent_ReturnsExisting', async () => {
    const repo = new FsJobApplicationRepository({ config: tmpConfig() });
    await repo.add(application('a1'));
    expect(await repo.findByPostingAndTalent('team', 'p1', 't1')).toMatchObject({ id: 'a1' });
    expect(await repo.findByPostingAndTalent('team', 'p1', 'other')).toBeNull();
  });

  it('FsJobApplicationRepository_TwoWorkspaces_AreIsolated', async () => {
    const repo = new FsJobApplicationRepository({ config: tmpConfig() });
    await repo.add(application('a1', 'team'));
    await repo.add(application('a2', 'other'));
    expect(await repo.findById('team', 'a2')).toBeNull();
    expect(await repo.findById('other', 'a1')).toBeNull();
    expect(await repo.delete('other', 'a1')).toBe(false);
  });

  it('FsJobApplicationRepository_CorruptFile_ReturnsEmpty', async () => {
    const config = tmpConfig();
    await fs.mkdir(path.dirname(config.jobApplicationsFile), { recursive: true });
    await fs.writeFile(config.jobApplicationsFile, 'not json');
    const repo = new FsJobApplicationRepository({ config });
    expect(await repo.list('team')).toEqual([]);
    await fs.writeFile(config.jobApplicationsFile, '{"x":1}');
    expect(await repo.list('team')).toEqual([]);
  });

  it('FsJobApplicationRepository_ConcurrentWrites_AreSerialized', async () => {
    const config = tmpConfig();
    const repo = new FsJobApplicationRepository({ config });
    await Promise.all(Array.from({ length: 25 }, (_, i) => repo.add(application(`a${i}`, 'team'))));
    expect(await repo.list('team')).toHaveLength(25);
  });

  it('FsJobApplicationRepository_AddFindUpdateDelete_RoundTrips', async () => {
    const repo = new FsJobApplicationRepository({ config: tmpConfig() });
    await repo.add(application('a1'));
    expect(await repo.findById('team', 'a1')).toMatchObject({ id: 'a1', postingCompany: 'Acme' });
    await repo.update(application('a1', 'team', { postingCompany: 'New' }));
    expect((await repo.findById('team', 'a1'))?.postingCompany).toBe('New');
    expect(await repo.delete('team', 'a1')).toBe(true);
    expect(await repo.delete('team', 'a1')).toBe(false);
  });
});
