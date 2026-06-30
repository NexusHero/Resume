import { promises as fs } from 'node:fs';
import { mkdtempSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { AppConfig } from '../../src/config';
import { FsApplicationRepository } from '../../src/adapters/fs-application-repository';
import { FsAuditLog } from '../../src/adapters/fs-audit-log';
import { FsPdfArchive } from '../../src/adapters/fs-pdf-archive';
import { FsSavedSearchRepository } from '../../src/adapters/fs-saved-search-repository';
import { FsMandateRepository } from '../../src/adapters/fs-mandate-repository';
import type { Application, AuditEvent } from '../../src/domain/application';
import type { SavedSearch } from '../../src/domain/saved-search';
import type { Mandate } from '../../src/domain/mandate';

function tmpConfig(): AppConfig {
  const rootDir = mkdtempSync(path.join(os.tmpdir(), 'resume-'));
  const storeDir = path.join(rootDir, 'bewerbungen');
  return {
    port: 0,
    rootDir,
    storeDir,
    logFile: path.join(storeDir, 'log.json'),
    historyFile: path.join(storeDir, 'history.jsonl'),
    savedSearchesFile: path.join(storeDir, 'saved-searches.json'),
    mandatesFile: path.join(storeDir, 'mandates.json'),
    staticDir: rootDir,
    versionedPaths: ['bewerbungen'],
    candidateProfile: { skills: [] },
    candidate: { name: 'Test User', title: 'Engineer' },
    llm: {
      provider: 'claude',
      anthropic: { apiKey: '', model: 'claude-opus-4-8' },
      gemini: { apiKey: '', model: 'gemini-2.5-flash' },
    },
    defaultJobSearch: { threshold: 80 },
    jobSources: {
      arbeitnow: { enabled: false },
      bundesagentur: { enabled: false, apiKey: 'test' },
      adzuna: { enabled: false, appId: '', appKey: '', country: 'de' },
    },
    store: 'fs',
    databaseUrl: '',
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

const search = (id: string, name = 'Rust'): SavedSearch => ({
  id,
  name,
  query: { q: 'Rust', threshold: 80 },
  createdAt: '2026-06-25T10:00:00.000Z',
});

describe('FsSavedSearchRepository', () => {
  it('Repository_NoFile_ListsEmpty', async () => {
    const repo = new FsSavedSearchRepository({ config: tmpConfig() });
    expect(await repo.list()).toEqual([]);
  });

  it('Repository_AddThenFind_RoundTrips', async () => {
    const repo = new FsSavedSearchRepository({ config: tmpConfig() });
    await repo.add(search('s1'));
    expect(await repo.findById('s1')).toMatchObject({ id: 's1', name: 'Rust' });
    expect(await repo.findById('missing')).toBeNull();
  });

  it('Repository_RemoveExisting_ReturnsTrueAndDeletes', async () => {
    const repo = new FsSavedSearchRepository({ config: tmpConfig() });
    await repo.add(search('s1'));
    expect(await repo.remove('s1')).toBe(true);
    expect(await repo.list()).toEqual([]);
  });

  it('Repository_RemoveUnknown_ReturnsFalse', async () => {
    const repo = new FsSavedSearchRepository({ config: tmpConfig() });
    await repo.add(search('s1'));
    expect(await repo.remove('nope')).toBe(false);
    expect(await repo.list()).toHaveLength(1);
  });

  it('Repository_MalformedFile_ListsEmpty', async () => {
    const config = tmpConfig();
    await fs.mkdir(config.storeDir, { recursive: true });
    await fs.writeFile(config.savedSearchesFile, 'not json');
    const repo = new FsSavedSearchRepository({ config });
    expect(await repo.list()).toEqual([]);
  });

  it('Repository_NonArrayJson_ListsEmpty', async () => {
    const config = tmpConfig();
    await fs.mkdir(config.storeDir, { recursive: true });
    await fs.writeFile(config.savedSearchesFile, '{"x":1}');
    const repo = new FsSavedSearchRepository({ config });
    expect(await repo.list()).toEqual([]);
  });
});

const mandate = (id: string, client = 'Aurora'): Mandate => ({
  id,
  client,
  role: 'C++ Engineer',
  location: 'Berlin',
  fee: '22%',
  feeValue: '17.160 €',
  deadline: '2026-07-30',
  priority: 'high',
  status: 'active',
  submitted: 0,
  interviews: 0,
  createdAt: '2026-06-25T10:00:00.000Z',
  updatedAt: '2026-06-25T10:00:00.000Z',
});

describe('FsMandateRepository', () => {
  it('Repository_NoFile_ListsEmpty', async () => {
    const repo = new FsMandateRepository({ config: tmpConfig() });
    expect(await repo.list()).toEqual([]);
  });

  it('Repository_AddThenFind_RoundTrips', async () => {
    const repo = new FsMandateRepository({ config: tmpConfig() });
    await repo.add(mandate('m1'));
    expect(await repo.findById('m1')).toMatchObject({ id: 'm1', client: 'Aurora' });
    expect(await repo.findById('missing')).toBeNull();
  });

  it('Repository_UpdateExisting_Replaces', async () => {
    const repo = new FsMandateRepository({ config: tmpConfig() });
    await repo.add(mandate('m1'));
    await repo.update({ ...mandate('m1'), status: 'paused' });
    expect(await repo.findById('m1')).toMatchObject({ status: 'paused' });
  });

  it('Repository_UpdateMissing_Inserts', async () => {
    const repo = new FsMandateRepository({ config: tmpConfig() });
    await repo.update(mandate('m9'));
    expect(await repo.findById('m9')).toMatchObject({ id: 'm9' });
  });

  it('Repository_RemoveExisting_ReturnsTrueAndDeletes', async () => {
    const repo = new FsMandateRepository({ config: tmpConfig() });
    await repo.add(mandate('m1'));
    expect(await repo.remove('m1')).toBe(true);
    expect(await repo.list()).toEqual([]);
  });

  it('Repository_RemoveUnknown_ReturnsFalse', async () => {
    const repo = new FsMandateRepository({ config: tmpConfig() });
    await repo.add(mandate('m1'));
    expect(await repo.remove('nope')).toBe(false);
    expect(await repo.list()).toHaveLength(1);
  });

  it('Repository_MalformedFile_ListsEmpty', async () => {
    const config = tmpConfig();
    await fs.mkdir(config.storeDir, { recursive: true });
    await fs.writeFile(config.mandatesFile, 'not json');
    const repo = new FsMandateRepository({ config });
    expect(await repo.list()).toEqual([]);
  });
});
