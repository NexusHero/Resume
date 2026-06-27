import { promises as fs } from 'node:fs';
import { mkdtempSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { AppConfig } from '../../src/config';
import { FsApplicationRepository } from '../../src/adapters/fs-application-repository';
import { FsAuditLog } from '../../src/adapters/fs-audit-log';
import { FsPdfArchive } from '../../src/adapters/fs-pdf-archive';
import type { Application, AuditEvent } from '../../src/domain/application';

function tmpConfig(): AppConfig {
  const rootDir = mkdtempSync(path.join(os.tmpdir(), 'resume-'));
  const storeDir = path.join(rootDir, 'bewerbungen');
  return {
    port: 0,
    rootDir,
    storeDir,
    logFile: path.join(storeDir, 'log.json'),
    historyFile: path.join(storeDir, 'history.jsonl'),
    staticDir: rootDir,
    versionedPaths: ['bewerbungen'],
    candidateProfile: { skills: [] },
    defaultJobSearch: { threshold: 80 },
    jobSources: {
      arbeitnow: { enabled: false },
      bundesagentur: { enabled: false, apiKey: 'test' },
      adzuna: { enabled: false, appId: '', appKey: '', country: 'de' },
    },
  };
}

const app = (id: string, company = 'Aurora'): Application => ({
  id,
  date: '2026-06-25',
  company,
  position: '',
  address: '',
  reference: '',
  status: 'sent',
  pdfPath: null,
  source: 'test',
  createdAt: '2026-06-25T10:00:00.000Z',
});

describe('FsApplicationRepository', () => {
  it('Repository_NoFile_ListsEmpty', async () => {
    const repo = new FsApplicationRepository({ config: tmpConfig() });
    expect(await repo.list()).toEqual([]);
  });

  it('Repository_AddThenFind_RoundTrips', async () => {
    const repo = new FsApplicationRepository({ config: tmpConfig() });
    await repo.add(app('a1'));
    expect(await repo.findById('a1')).toMatchObject({ id: 'a1' });
    expect(await repo.findById('missing')).toBeNull();
  });

  it('Repository_UpdateExisting_Replaces', async () => {
    const repo = new FsApplicationRepository({ config: tmpConfig() });
    await repo.add(app('a1', 'Old'));
    await repo.update({ ...app('a1', 'New') });
    expect((await repo.findById('a1'))?.company).toBe('New');
    expect(await repo.list()).toHaveLength(1);
  });

  it('Repository_UpdateUnknown_Appends', async () => {
    const repo = new FsApplicationRepository({ config: tmpConfig() });
    await repo.update(app('a9'));
    expect(await repo.list()).toHaveLength(1);
  });

  it('Repository_MalformedFile_ListsEmpty', async () => {
    const config = tmpConfig();
    await fs.mkdir(config.storeDir, { recursive: true });
    await fs.writeFile(config.logFile, 'not json');
    const repo = new FsApplicationRepository({ config });
    expect(await repo.list()).toEqual([]);
  });

  it('Repository_ValidNonArrayJson_ListsEmpty', async () => {
    const config = tmpConfig();
    await fs.mkdir(config.storeDir, { recursive: true });
    await fs.writeFile(config.logFile, '{"not":"an array"}');
    const repo = new FsApplicationRepository({ config });
    expect(await repo.list()).toEqual([]);
  });
});

describe('FsAuditLog', () => {
  it('AuditLog_NoFile_ListsEmpty', async () => {
    const log = new FsAuditLog({ config: tmpConfig() });
    expect(await log.list()).toEqual([]);
  });

  it('AuditLog_AppendThenList_PreservesOrder', async () => {
    const log = new FsAuditLog({ config: tmpConfig() });
    const e1: AuditEvent = { ts: 't1', action: 'create', id: 'a1' };
    const e2: AuditEvent = { ts: 't2', action: 'commit', id: 'a1', commit: 'abc' };
    await log.append(e1);
    await log.append(e2);
    expect(await log.list()).toEqual([e1, e2]);
  });
});

describe('FsPdfArchive', () => {
  it('Archive_Save_WritesFileAndReturnsRelativePath', async () => {
    const config = tmpConfig();
    const archive = new FsPdfArchive({ config });
    const rel = await archive.save('2026-06-25_aurora_a1', Buffer.from('PDF'));
    expect(rel).toBe('bewerbungen/2026-06-25_aurora_a1.pdf');
    const written = await fs.readFile(path.join(config.rootDir, rel), 'utf8');
    expect(written).toBe('PDF');
  });
});
