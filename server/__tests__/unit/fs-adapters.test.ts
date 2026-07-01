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
import { FsTalentRepository } from '../../src/adapters/fs-talent-repository';
import { FsPlacementRepository } from '../../src/adapters/fs-placement-repository';
import { FsUserRepository } from '../../src/adapters/fs-user-repository';
import { FsSessionStore } from '../../src/adapters/fs-session-store';
import { FsPasswordResetTokenStore } from '../../src/adapters/fs-password-reset-token-store';
import { FsApiKeyStore } from '../../src/adapters/fs-api-key-store';
import { SecretCipher } from '../../src/adapters/secret-cipher';
import { FixedClock } from '../support/fakes';
import type { Application, AuditEvent } from '../../src/domain/application';
import type { User } from '../../src/domain/user';
import type { SavedSearch } from '../../src/domain/saved-search';
import type { Mandate } from '../../src/domain/mandate';
import type { Talent } from '../../src/domain/talent';
import type { Placement } from '../../src/domain/placement';

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
    talentsFile: path.join(storeDir, 'talents.json'),
    placementsFile: path.join(storeDir, 'placements.json'),
    usersFile: path.join(storeDir, 'users.json'),
    sessionsFile: path.join(storeDir, 'sessions.json'),
    passwordResetTokensFile: path.join(storeDir, 'password-reset-tokens.json'),
    apiKeysFile: path.join(storeDir, 'api-keys.json'),
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
    auth: {
      sessionCookieName: 'myjob_session',
      cookieSecure: false,
      sessionTtlMs: 30 * 24 * 60 * 60 * 1000,
      google: { enabled: false },
      linkedin: { enabled: false },
    },
    security: { corsOrigins: [], encryptionSecret: 'test-secret' },
    mail: {
      transport: 'console',
      from: 'myJob <no-reply@test.local>',
      appBaseUrl: 'http://localhost:0',
      resetTokenTtlMs: 60 * 60 * 1000,
      smtp: { host: '', port: 587, secure: false, user: '', pass: '' },
    },
  };
}

const user = (id: string, email: string): User => ({
  id,
  email,
  passwordHash: 'scrypt$salt$key',
  createdAt: '2026-06-25T10:00:00.000Z',
});

describe('FsUserRepository', () => {
  it('Repository_NoFile_FindsNothing', async () => {
    const repo = new FsUserRepository({ config: tmpConfig() });
    expect(await repo.findByEmail('a@example.com')).toBeNull();
    expect(await repo.findById('u1')).toBeNull();
  });

  it('Repository_AddThenFind_RoundTrips', async () => {
    const repo = new FsUserRepository({ config: tmpConfig() });
    await repo.add(user('u1', 'a@example.com'));
    expect(await repo.findByEmail('a@example.com')).toMatchObject({ id: 'u1' });
    expect(await repo.findById('u1')).toMatchObject({ email: 'a@example.com' });
    expect(await repo.findByEmail('none@example.com')).toBeNull();
  });

  it('Repository_MalformedOrNonArrayFile_FindsNothing', async () => {
    const config = tmpConfig();
    await fs.mkdir(config.storeDir, { recursive: true });
    await fs.writeFile(config.usersFile, 'not json');
    expect(await new FsUserRepository({ config }).findByEmail('a@example.com')).toBeNull();
    await fs.writeFile(config.usersFile, '{"x":1}');
    expect(await new FsUserRepository({ config }).findById('u1')).toBeNull();
  });

  it('Repository_RemoveExisting_DeletesAndReturnsTrue', async () => {
    const repo = new FsUserRepository({ config: tmpConfig() });
    await repo.add(user('u1', 'a@example.com'));
    await repo.add(user('u2', 'b@example.com'));
    expect(await repo.remove('u1')).toBe(true);
    expect(await repo.findById('u1')).toBeNull();
    expect(await repo.findById('u2')).toMatchObject({ id: 'u2' }); // others kept
  });

  it('Repository_RemoveUnknown_ReturnsFalse', async () => {
    const repo = new FsUserRepository({ config: tmpConfig() });
    await repo.add(user('u1', 'a@example.com'));
    expect(await repo.remove('nope')).toBe(false);
  });
});

const fixedClock = new FixedClock();

describe('FsSessionStore', () => {
  it('CreateThenLookup_ReturnsUserId', async () => {
    const store = new FsSessionStore({ config: tmpConfig(), clock: fixedClock });
    const token = await store.create('u1');
    expect(await store.userIdFor(token)).toBe('u1');
  });

  it('Lookup_UnknownToken_ReturnsNull', async () => {
    const store = new FsSessionStore({ config: tmpConfig(), clock: fixedClock });
    expect(await store.userIdFor('nope')).toBeNull();
  });

  it('Sessions_PersistAcrossInstances', async () => {
    const config = tmpConfig();
    const token = await new FsSessionStore({ config, clock: fixedClock }).create('u1');
    // A fresh instance (e.g. after a restart) still resolves the token.
    expect(await new FsSessionStore({ config, clock: fixedClock }).userIdFor(token)).toBe('u1');
  });

  it('Destroy_RemovesSession', async () => {
    const store = new FsSessionStore({ config: tmpConfig(), clock: fixedClock });
    const token = await store.create('u1');
    await store.destroy(token);
    expect(await store.userIdFor(token)).toBeNull();
  });

  it('DestroyForUser_RemovesAllOfThatUsersSessions', async () => {
    const store = new FsSessionStore({ config: tmpConfig(), clock: fixedClock });
    const a1 = await store.create('u1');
    const b1 = await store.create('u2');
    await store.destroyForUser('u1');
    expect(await store.userIdFor(a1)).toBeNull();
    expect(await store.userIdFor(b1)).toBe('u2');
    await store.destroyForUser('absent'); // no rows match — no throw, no change
    expect(await store.userIdFor(b1)).toBe('u2');
  });

  it('Destroy_UnknownToken_NoOp', async () => {
    const store = new FsSessionStore({ config: tmpConfig(), clock: fixedClock });
    await store.create('u1');
    await store.destroy('not-a-real-token'); // must not throw or drop other rows
    expect(await store.userIdFor('not-a-real-token')).toBeNull();
  });

  it('Store_MalformedFile_TreatedAsEmpty', async () => {
    const config = tmpConfig();
    await fs.mkdir(config.storeDir, { recursive: true });
    await fs.writeFile(config.sessionsFile, 'not json');
    const store = new FsSessionStore({ config, clock: fixedClock });
    expect(await store.userIdFor('anything')).toBeNull();
    // A subsequent create recovers the file to a valid array.
    const token = await store.create('u2');
    expect(await store.userIdFor(token)).toBe('u2');
  });

  it('Session_PastTtl_RejectedAndPruned', async () => {
    // A mutable clock lets time advance past the 30-day TTL between create/read.
    let nowIso = '2026-01-01T00:00:00.000Z';
    const clock = {
      isoNow: () => nowIso,
      now: () => new Date(nowIso),
      today: () => nowIso.slice(0, 10),
    };
    const store = new FsSessionStore({ config: tmpConfig(), clock });
    const token = await store.create('u1');
    expect(await store.userIdFor(token)).toBe('u1'); // fresh → valid
    nowIso = '2026-03-01T00:00:00.000Z'; // > 30 days later
    expect(await store.userIdFor(token)).toBeNull(); // expired
    nowIso = '2026-01-01T00:00:00.000Z'; // even rewinding, the row was pruned
    expect(await store.userIdFor(token)).toBeNull();
  });
});

describe('FsPasswordResetTokenStore', () => {
  it('Consume_ValidToken_ReturnsUserIdOnceThenGone', async () => {
    const config = tmpConfig();
    const store = new FsPasswordResetTokenStore({ config, clock: fixedClock });
    const token = await store.create('u1');
    expect(await store.consume(token)).toBe('u1'); // single-use
    expect(await store.consume(token)).toBeNull(); // already consumed
  });

  it('Consume_UnknownToken_ReturnsNull', async () => {
    const store = new FsPasswordResetTokenStore({ config: tmpConfig(), clock: fixedClock });
    expect(await store.consume('nope')).toBeNull();
  });

  it('Consume_ExpiredToken_ReturnsNullAndPrunes', async () => {
    let nowIso = '2026-01-01T00:00:00.000Z';
    const clock = {
      isoNow: () => nowIso,
      now: () => new Date(nowIso),
      today: () => nowIso.slice(0, 10),
    };
    const store = new FsPasswordResetTokenStore({ config: tmpConfig(), clock });
    const token = await store.create('u1');
    nowIso = '2026-01-01T02:00:00.000Z'; // > 60-minute TTL
    expect(await store.consume(token)).toBeNull();
  });

  it('DestroyForUser_DropsOnlyThatUsersTokens', async () => {
    const config = tmpConfig();
    const store = new FsPasswordResetTokenStore({ config, clock: fixedClock });
    const a = await store.create('u1');
    const b = await store.create('u2');
    await store.destroyForUser('u1');
    expect(await store.consume(a)).toBeNull();
    expect(await store.consume(b)).toBe('u2');
  });
});

describe('FsApiKeyStore', () => {
  const cipher = () => new SecretCipher({ config: { security: { encryptionSecret: 's3cret' } } });

  it('SetGet_RoundTrips_AndStoresCiphertextNotPlaintext', async () => {
    const config = tmpConfig();
    const store = new FsApiKeyStore({ config, secretCipher: cipher() });
    await store.set('owner1', 'claude', 'sk-ant-PLAINTEXT');
    expect(await store.get('owner1', 'claude')).toBe('sk-ant-PLAINTEXT');
    // the file must not contain the plaintext key
    const raw = await fs.readFile(config.apiKeysFile, 'utf8');
    expect(raw).not.toContain('sk-ant-PLAINTEXT');
  });

  it('Set_OverwritesExisting_PerProvider', async () => {
    const store = new FsApiKeyStore({ config: tmpConfig(), secretCipher: cipher() });
    await store.set('owner1', 'claude', 'first');
    await store.set('owner1', 'claude', 'second');
    expect(await store.get('owner1', 'claude')).toBe('second');
  });

  it('Get_ScopedToOwnerAndProvider', async () => {
    const store = new FsApiKeyStore({ config: tmpConfig(), secretCipher: cipher() });
    await store.set('owner1', 'claude', 'a');
    expect(await store.get('owner2', 'claude')).toBeNull();
    expect(await store.get('owner1', 'gemini')).toBeNull();
  });

  it('ProvidersFor_ListsConfiguredProviders', async () => {
    const store = new FsApiKeyStore({ config: tmpConfig(), secretCipher: cipher() });
    await store.set('owner1', 'claude', 'a');
    await store.set('owner1', 'gemini', 'b');
    await store.set('other', 'claude', 'c');
    expect((await store.providersFor('owner1')).sort()).toEqual(['claude', 'gemini']);
  });

  it('Remove_DeletesAndReportsWhether', async () => {
    const store = new FsApiKeyStore({ config: tmpConfig(), secretCipher: cipher() });
    await store.set('owner1', 'claude', 'a');
    expect(await store.remove('owner1', 'claude')).toBe(true);
    expect(await store.remove('owner1', 'claude')).toBe(false);
    expect(await store.get('owner1', 'claude')).toBeNull();
  });

  it('MalformedFile_TreatedAsEmpty', async () => {
    const config = tmpConfig();
    await fs.mkdir(config.storeDir, { recursive: true });
    await fs.writeFile(config.apiKeysFile, 'not json');
    const store = new FsApiKeyStore({ config, secretCipher: cipher() });
    expect(await store.get('owner1', 'claude')).toBeNull();
  });
});

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

const OWNER = 'owner1';

const mandate = (id: string, client = 'Aurora', ownerId = OWNER): Mandate => ({
  id,
  ownerId,
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
    expect(await repo.list(OWNER)).toEqual([]);
  });

  it('Repository_AddThenFind_RoundTrips', async () => {
    const repo = new FsMandateRepository({ config: tmpConfig() });
    await repo.add(mandate('m1'));
    expect(await repo.findById(OWNER, 'm1')).toMatchObject({ id: 'm1', client: 'Aurora' });
    expect(await repo.findById(OWNER, 'missing')).toBeNull();
  });

  it('Repository_FindById_OtherOwner_ReturnsNull', async () => {
    const repo = new FsMandateRepository({ config: tmpConfig() });
    await repo.add(mandate('m1'));
    expect(await repo.findById('intruder', 'm1')).toBeNull();
  });

  it('Repository_List_ScopesToOwner', async () => {
    const repo = new FsMandateRepository({ config: tmpConfig() });
    await repo.add(mandate('m1'));
    await repo.add(mandate('m2', 'Beta', 'other'));
    expect(await repo.list(OWNER)).toHaveLength(1);
    expect(await repo.list('other')).toHaveLength(1);
  });

  it('Repository_UpdateExisting_Replaces', async () => {
    const repo = new FsMandateRepository({ config: tmpConfig() });
    await repo.add(mandate('m1'));
    await repo.update({ ...mandate('m1'), status: 'paused' });
    expect(await repo.findById(OWNER, 'm1')).toMatchObject({ status: 'paused' });
  });

  it('Repository_UpdateMissing_Inserts', async () => {
    const repo = new FsMandateRepository({ config: tmpConfig() });
    await repo.update(mandate('m9'));
    expect(await repo.findById(OWNER, 'm9')).toMatchObject({ id: 'm9' });
  });

  it('Repository_RemoveExisting_ReturnsTrueAndDeletes', async () => {
    const repo = new FsMandateRepository({ config: tmpConfig() });
    await repo.add(mandate('m1'));
    expect(await repo.remove(OWNER, 'm1')).toBe(true);
    expect(await repo.list(OWNER)).toEqual([]);
  });

  it('Repository_RemoveOtherOwner_ReturnsFalse', async () => {
    const repo = new FsMandateRepository({ config: tmpConfig() });
    await repo.add(mandate('m1'));
    expect(await repo.remove('intruder', 'm1')).toBe(false);
    expect(await repo.list(OWNER)).toHaveLength(1);
  });

  it('Repository_RemoveUnknown_ReturnsFalse', async () => {
    const repo = new FsMandateRepository({ config: tmpConfig() });
    await repo.add(mandate('m1'));
    expect(await repo.remove(OWNER, 'nope')).toBe(false);
    expect(await repo.list(OWNER)).toHaveLength(1);
  });

  it('Repository_MalformedFile_ListsEmpty', async () => {
    const config = tmpConfig();
    await fs.mkdir(config.storeDir, { recursive: true });
    await fs.writeFile(config.mandatesFile, 'not json');
    const repo = new FsMandateRepository({ config });
    expect(await repo.list(OWNER)).toEqual([]);
  });
});

const talent = (id: string, name = 'Lena', ownerId = OWNER): Talent => ({
  id,
  ownerId,
  name,
  role: 'Product Designer',
  headline: '',
  location: 'Leipzig',
  email: '',
  phone: '',
  availability: '',
  salary: '',
  skills: [],
  createdAt: '2026-06-25T10:00:00.000Z',
  updatedAt: '2026-06-25T10:00:00.000Z',
});

describe('FsTalentRepository', () => {
  it('Repository_NoFile_ListsEmpty', async () => {
    const repo = new FsTalentRepository({ config: tmpConfig() });
    expect(await repo.list(OWNER)).toEqual([]);
  });

  it('Repository_AddThenFind_RoundTrips', async () => {
    const repo = new FsTalentRepository({ config: tmpConfig() });
    await repo.add(talent('t1'));
    expect(await repo.findById(OWNER, 't1')).toMatchObject({ id: 't1', name: 'Lena' });
    expect(await repo.findById(OWNER, 'missing')).toBeNull();
  });

  it('Repository_List_ScopesToOwner', async () => {
    const repo = new FsTalentRepository({ config: tmpConfig() });
    await repo.add(talent('t1'));
    await repo.add(talent('t2', 'Marco', 'other'));
    expect(await repo.list(OWNER)).toHaveLength(1);
    expect(await repo.list('other')).toHaveLength(1);
  });

  it('Repository_UpdateExisting_Replaces', async () => {
    const repo = new FsTalentRepository({ config: tmpConfig() });
    await repo.add(talent('t1'));
    await repo.update({ ...talent('t1'), availability: 'immediately' });
    expect(await repo.findById(OWNER, 't1')).toMatchObject({ availability: 'immediately' });
  });

  it('Repository_UpdateMissing_Inserts', async () => {
    const repo = new FsTalentRepository({ config: tmpConfig() });
    await repo.update(talent('t9'));
    expect(await repo.findById(OWNER, 't9')).toMatchObject({ id: 't9' });
  });

  it('Repository_RemoveExisting_ReturnsTrueAndDeletes', async () => {
    const repo = new FsTalentRepository({ config: tmpConfig() });
    await repo.add(talent('t1'));
    expect(await repo.remove(OWNER, 't1')).toBe(true);
    expect(await repo.list(OWNER)).toEqual([]);
  });

  it('Repository_RemoveOtherOwner_ReturnsFalse', async () => {
    const repo = new FsTalentRepository({ config: tmpConfig() });
    await repo.add(talent('t1'));
    expect(await repo.remove('intruder', 't1')).toBe(false);
    expect(await repo.list(OWNER)).toHaveLength(1);
  });

  it('Repository_RemoveUnknown_ReturnsFalse', async () => {
    const repo = new FsTalentRepository({ config: tmpConfig() });
    await repo.add(talent('t1'));
    expect(await repo.remove(OWNER, 'nope')).toBe(false);
    expect(await repo.list(OWNER)).toHaveLength(1);
  });

  it('Repository_MalformedFile_ListsEmpty', async () => {
    const config = tmpConfig();
    await fs.mkdir(config.storeDir, { recursive: true });
    await fs.writeFile(config.talentsFile, 'not json');
    const repo = new FsTalentRepository({ config });
    expect(await repo.list(OWNER)).toEqual([]);
  });
});

const placement = (id: string, candidateName = 'Mara Vogel', ownerId = OWNER): Placement => ({
  id,
  ownerId,
  candidateName,
  candidateRole: 'Engineering Manager',
  client: 'Aurora Systems GmbH',
  start: '2026-07-01',
  fee: '19.000 €',
  status: 'invoiced',
  createdAt: '2026-06-25T10:00:00.000Z',
  updatedAt: '2026-06-25T10:00:00.000Z',
});

describe('FsPlacementRepository', () => {
  it('Repository_NoFile_ListsEmpty', async () => {
    const repo = new FsPlacementRepository({ config: tmpConfig() });
    expect(await repo.list(OWNER)).toEqual([]);
  });

  it('Repository_AddThenFind_RoundTrips', async () => {
    const repo = new FsPlacementRepository({ config: tmpConfig() });
    await repo.add(placement('p1'));
    expect(await repo.findById(OWNER, 'p1')).toMatchObject({
      id: 'p1',
      candidateName: 'Mara Vogel',
    });
    expect(await repo.findById(OWNER, 'missing')).toBeNull();
  });

  it('Repository_List_ScopesToOwner', async () => {
    const repo = new FsPlacementRepository({ config: tmpConfig() });
    await repo.add(placement('p1'));
    await repo.add(placement('p2', 'Lena', 'other'));
    expect(await repo.list(OWNER)).toHaveLength(1);
    expect(await repo.list('other')).toHaveLength(1);
  });

  it('Repository_UpdateExisting_Replaces', async () => {
    const repo = new FsPlacementRepository({ config: tmpConfig() });
    await repo.add(placement('p1'));
    await repo.update({ ...placement('p1'), status: 'paid' });
    expect(await repo.findById(OWNER, 'p1')).toMatchObject({ status: 'paid' });
  });

  it('Repository_UpdateMissing_Inserts', async () => {
    const repo = new FsPlacementRepository({ config: tmpConfig() });
    await repo.update(placement('p9'));
    expect(await repo.findById(OWNER, 'p9')).toMatchObject({ id: 'p9' });
  });

  it('Repository_RemoveExisting_ReturnsTrueAndDeletes', async () => {
    const repo = new FsPlacementRepository({ config: tmpConfig() });
    await repo.add(placement('p1'));
    expect(await repo.remove(OWNER, 'p1')).toBe(true);
    expect(await repo.list(OWNER)).toEqual([]);
  });

  it('Repository_RemoveOtherOwner_ReturnsFalse', async () => {
    const repo = new FsPlacementRepository({ config: tmpConfig() });
    await repo.add(placement('p1'));
    expect(await repo.remove('intruder', 'p1')).toBe(false);
    expect(await repo.list(OWNER)).toHaveLength(1);
  });

  it('Repository_RemoveUnknown_ReturnsFalse', async () => {
    const repo = new FsPlacementRepository({ config: tmpConfig() });
    await repo.add(placement('p1'));
    expect(await repo.remove(OWNER, 'nope')).toBe(false);
    expect(await repo.list(OWNER)).toHaveLength(1);
  });

  it('Repository_MalformedFile_ListsEmpty', async () => {
    const config = tmpConfig();
    await fs.mkdir(config.storeDir, { recursive: true });
    await fs.writeFile(config.placementsFile, 'not json');
    const repo = new FsPlacementRepository({ config });
    expect(await repo.list(OWNER)).toEqual([]);
  });
});
