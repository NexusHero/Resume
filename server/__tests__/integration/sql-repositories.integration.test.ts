import type { Pool } from 'pg';
import { createDb, migrate, type Db } from '../../src/adapters/sql/db.js';
import { SqlApplicationRepository } from '../../src/adapters/sql/sql-application-repository.js';
import { SqlAuditLog } from '../../src/adapters/sql/sql-audit-log.js';
import { SqlSavedSearchRepository } from '../../src/adapters/sql/sql-saved-search-repository.js';
import { SqlMandateRepository } from '../../src/adapters/sql/sql-mandate-repository.js';
import { SqlTalentRepository } from '../../src/adapters/sql/sql-talent-repository.js';
import { SqlPlacementRepository } from '../../src/adapters/sql/sql-placement-repository.js';
import { SqlUserRepository } from '../../src/adapters/sql/sql-user-repository.js';
import { SqlPasswordResetTokenStore } from '../../src/adapters/sql/sql-password-reset-token-store.js';
import { SqlEmailVerificationTokenStore } from '../../src/adapters/sql/sql-email-verification-token-store.js';
import { SqlWorkspaceSettingsStore } from '../../src/adapters/sql/sql-workspace-settings-store.js';
import { SqlDocumentRepository } from '../../src/adapters/sql/sql-document-repository.js';
import { SqlAttachmentStore } from '../../src/adapters/sql/sql-attachment-store.js';
import { SqlJobPostingRepository } from '../../src/adapters/sql/sql-job-posting-repository.js';
import { loadConfig } from '../../src/config.js';
import type { Application, AuditEvent } from '../../src/domain/application.js';
import type { SavedSearch } from '../../src/domain/saved-search.js';
import type { JobPosting } from '../../src/domain/job-posting.js';
import type { Mandate } from '../../src/domain/mandate.js';
import type { Talent } from '../../src/domain/talent.js';
import type { Placement } from '../../src/domain/placement.js';
import type { User } from '../../src/domain/user.js';
import type { TalentDocuments } from '../../src/domain/talent-documents.js';

/**
 * Real-Postgres integration. Skipped unless DATABASE_URL is set, so the default
 * (no DB, CI, pre-commit) stays green; run with a throwaway database via:
 *   DATABASE_URL=postgres://... npx jest sql-repositories
 */
const url = process.env.DATABASE_URL;
const suite = url ? describe : describe.skip;

suite('SQL repositories (real Postgres)', () => {
  let db: Db;
  let pool: Pool;

  beforeAll(async () => {
    const conn = createDb(url as string);
    db = conn.db;
    pool = conn.pool;
    await migrate(pool);
  });

  afterAll(async () => {
    await pool.end();
  });

  beforeEach(async () => {
    await pool.query(
      'TRUNCATE applications, audit_events, saved_searches, mandates, talents, placements, talent_documents, attachments, users, password_reset_tokens, api_keys, workspace_settings, job_postings RESTART IDENTITY',
    );
  });

  const user = (id: string, email = `${id}@example.com`): User => ({
    id,
    email,
    passwordHash: 'scrypt$salt$key',
    roles: ['recruiter'],
    createdAt: '2026-06-25T10:00:00.000Z',
  });

  const mandate = (id: string, ownerId = 'owner1', client = 'Aurora'): Mandate => ({
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
    submitted: 4,
    interviews: 2,
    jobText: '',
    lang: 'en',
    createdAt: '2026-06-25T10:00:00.000Z',
    updatedAt: '2026-06-25T10:00:00.000Z',
  });

  const talent = (id: string, ownerId = 'owner1', name = 'Lena'): Talent => ({
    id,
    ownerId,
    name,
    role: 'Product Designer',
    headline: '',
    location: 'Leipzig',
    email: '',
    phone: '',
    availability: 'immediately',
    salary: '64.000 €',
    skills: ['Figma', 'Design Systems'],
    createdAt: '2026-06-25T10:00:00.000Z',
    updatedAt: '2026-06-25T10:00:00.000Z',
  });

  const placement = (id: string, ownerId = 'owner1', candidateName = 'Mara Vogel'): Placement => ({
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

  const app = (id: string, company = 'Aurora', ownerId = 'owner1'): Application => ({
    id,
    ownerId,
    date: '2026-06-25',
    company,
    position: 'Engineer',
    address: 'Berlin',
    reference: '',
    status: 'sent',
    pdfPath: null,
    source: 'api',
    createdAt: '2026-06-25T10:00:00.000Z',
  });

  const posting = (
    id: string,
    ownerId = 'owner1',
    overrides: Partial<JobPosting> = {},
  ): JobPosting => ({
    id,
    ownerId,
    source: 'text',
    company: 'Acme',
    title: 'Engineer',
    location: 'Berlin',
    country: 'DE',
    description: 'Full ad text.',
    requirements: ['Rust'],
    descriptionIncomplete: false,
    createdAt: '2026-06-25T10:00:00.000Z',
    ...overrides,
  });

  it('Applications_AddFindUpdate_RoundTrips', async () => {
    const repo = new SqlApplicationRepository({ db });
    await repo.add(app('a1'));
    expect(await repo.findById('owner1', 'a1')).toMatchObject({ id: 'a1', company: 'Aurora' });
    expect(await repo.findById('owner1', 'missing')).toBeNull();

    await repo.update({ ...app('a1', 'New'), status: 'interview', commit: 'abc1234' });
    const updated = await repo.findById('owner1', 'a1');
    expect(updated).toMatchObject({ company: 'New', status: 'interview', commit: 'abc1234' });
    expect(await repo.list('owner1')).toHaveLength(1);
  });

  it('Applications_ScopedByOwner_Isolated', async () => {
    const repo = new SqlApplicationRepository({ db });
    await repo.add(app('a1', 'Aurora', 'owner1'));
    await repo.add(app('a2', 'Helio', 'owner2'));
    expect((await repo.list('owner1')).map((a) => a.id)).toEqual(['a1']);
    expect(await repo.findById('owner1', 'a2')).toBeNull();
  });

  it('Applications_UpdateUnknown_Inserts', async () => {
    const repo = new SqlApplicationRepository({ db });
    await repo.update(app('a9'));
    expect(await repo.list('owner1')).toHaveLength(1);
  });

  it('AuditLog_AppendThenList_PreservesOrderAndJsonb', async () => {
    const log = new SqlAuditLog({ db });
    const e1: AuditEvent = { ts: 't1', action: 'create', id: 'a1', by: 'api' };
    const e2: AuditEvent = {
      ts: 't2',
      action: 'update',
      id: 'a1',
      changed: { status: { from: 'sent', to: 'interview' } },
    };
    await log.append(e1);
    await log.append(e2);
    expect(await log.list()).toEqual([e1, e2]);
  });

  it('SavedSearches_CrudRoundTrips', async () => {
    const repo = new SqlSavedSearchRepository({ db });
    const search: SavedSearch = {
      id: 's1',
      ownerId: 'owner1',
      name: 'Rust',
      query: { q: 'Rust', threshold: 70 },
      createdAt: 'now',
    };
    await repo.add(search);
    expect(await repo.list('owner1')).toEqual([search]);
    expect(await repo.findById('owner1', 's1')).toEqual(search);
    expect(await repo.remove('owner1', 's1')).toBe(true);
    expect(await repo.remove('owner1', 's1')).toBe(false);
    expect(await repo.list('owner1')).toEqual([]);
  });

  it('SqlSavedSearchRepository_List_FiltersByOwner', async () => {
    const repo = new SqlSavedSearchRepository({ db });
    const search = (id: string, ownerId: string): SavedSearch => ({
      id,
      ownerId,
      name: id,
      query: { threshold: 70 },
      createdAt: 'now',
    });
    await repo.add(search('s1', 'owner1'));
    await repo.add(search('s2', 'owner2'));
    expect((await repo.list('owner1')).map((s) => s.id)).toEqual(['s1']);
    expect(await repo.findById('owner1', 's2')).toBeNull();
  });

  it('SqlSavedSearchRepository_RemoveOnlyOwned', async () => {
    const repo = new SqlSavedSearchRepository({ db });
    await repo.add({
      id: 's1',
      ownerId: 'owner1',
      name: 'Rust',
      query: { threshold: 70 },
      createdAt: 'now',
    });
    expect(await repo.remove('owner2', 's1')).toBe(false);
    expect(await repo.list('owner1')).toHaveLength(1);
    expect(await repo.remove('owner1', 's1')).toBe(true);
  });

  it('SqlJobPostingRepository_List_FiltersByOwner', async () => {
    const repo = new SqlJobPostingRepository({ db });
    await repo.add(posting('p1', 'owner1'));
    await repo.add(posting('p2', 'owner2'));
    expect((await repo.list('owner1')).map((p) => p.id)).toEqual(['p1']);
    expect(await repo.findById('owner1', 'p2')).toBeNull();
  });

  it('SqlJobPostingRepository_AddThenFindDuplicate_ReturnsExisting', async () => {
    const repo = new SqlJobPostingRepository({ db });
    await repo.add(posting('p1', 'owner1', { source: 'Arbeitnow', sourceId: 'slug-1' }));
    const dup = await repo.findDuplicate('owner1', 'Arbeitnow', 'slug-1', undefined);
    expect(dup).toMatchObject({ id: 'p1', sourceId: 'slug-1' });
    // same sourceId, different owner → not a duplicate
    expect(await repo.findDuplicate('owner2', 'Arbeitnow', 'slug-1', undefined)).toBeNull();
  });

  it('SqlJobPostingRepository_AddThenFindDuplicate_HostCaseTrailingSlash_ReturnsExisting', async () => {
    const repo = new SqlJobPostingRepository({ db });
    // the service normalises before calling; the adapter compares raw.
    await repo.add(posting('p1', 'owner1', { source: 'url', url: 'https://example.com/job' }));
    const dup = await repo.findDuplicate('owner1', 'url', undefined, 'https://example.com/job');
    expect(dup).toMatchObject({ id: 'p1' });
    expect(
      await repo.findDuplicate('owner1', 'url', undefined, 'https://example.com/other'),
    ).toBeNull();
  });

  it('SqlJobPostingRepository_TwoWorkspaces_AreIsolated', async () => {
    const repo = new SqlJobPostingRepository({ db });
    await repo.add(posting('p1', 'owner1', { url: 'https://example.com/job' }));
    await repo.add(posting('p2', 'owner2', { url: 'https://example.com/job' }));
    // same URL, two workspaces → both exist, scoped reads see only their own.
    expect((await repo.list('owner1')).map((p) => p.id)).toEqual(['p1']);
    expect((await repo.list('owner2')).map((p) => p.id)).toEqual(['p2']);
  });

  it('SqlJobPostingRepository_ConcurrentDuplicateInsert_ReturnsExisting', async () => {
    const repo = new SqlJobPostingRepository({ db });
    // Insert a winner first; then a second add with the same dedup key races it.
    const winner = posting('winner', 'owner1', { source: 'Arbeitnow', sourceId: 'slug-1' });
    await repo.add(winner);
    await repo.add(posting('loser', 'owner1', { source: 'Arbeitnow', sourceId: 'slug-1' }));
    // The unique index swallowed the second insert (23505); the repository re-queries.
    const dups = await repo.list('owner1');
    expect(dups).toHaveLength(1);
    expect(dups[0]?.id).toBe('winner');
  });

  it('Mandates_OwnerScoped_CrudRoundTrips', async () => {
    const repo = new SqlMandateRepository({ db });
    await repo.add(mandate('m1', 'owner1'));
    await repo.add(mandate('m2', 'other', 'Beta'));
    // list and findById are owner-scoped
    expect(await repo.list('owner1')).toEqual([mandate('m1', 'owner1')]);
    expect(await repo.findById('owner1', 'm1')).toMatchObject({ id: 'm1', submitted: 4 });
    expect(await repo.findById('other', 'm1')).toBeNull(); // not the other owner's row
    // update upserts by id; missing row inserts
    await repo.update({ ...mandate('m1', 'owner1'), status: 'paused' });
    expect(await repo.findById('owner1', 'm1')).toMatchObject({ status: 'paused' });
    await repo.update(mandate('m9', 'owner1'));
    expect(await repo.findById('owner1', 'm9')).toMatchObject({ id: 'm9' });
    // remove is owner-scoped
    expect(await repo.remove('other', 'm1')).toBe(false);
    expect(await repo.remove('owner1', 'm1')).toBe(true);
    expect(await repo.list('other')).toHaveLength(1);
  });

  it('Talents_OwnerScoped_CrudRoundTripsWithSkills', async () => {
    const repo = new SqlTalentRepository({ db });
    await repo.add(talent('t1', 'owner1'));
    await repo.add(talent('t2', 'other', 'Marco'));
    expect(await repo.list('owner1')).toEqual([talent('t1', 'owner1')]);
    expect(await repo.findById('owner1', 't1')).toMatchObject({
      id: 't1',
      skills: ['Figma', 'Design Systems'],
    });
    expect(await repo.findById('other', 't1')).toBeNull();
    expect(await repo.remove('owner1', 't1')).toBe(true);
    expect(await repo.list('owner1')).toEqual([]);
  });

  it('Placements_OwnerScoped_CrudRoundTrips', async () => {
    const repo = new SqlPlacementRepository({ db });
    await repo.add(placement('p1', 'owner1'));
    await repo.add(placement('p2', 'other', 'Tom'));
    expect(await repo.list('owner1')).toEqual([placement('p1', 'owner1')]);
    expect(await repo.findById('other', 'p1')).toBeNull();
    await repo.update({ ...placement('p1', 'owner1'), status: 'paid' });
    expect(await repo.findById('owner1', 'p1')).toMatchObject({ status: 'paid' });
    expect(await repo.remove('owner1', 'p1')).toBe(true);
    expect(await repo.list('owner1')).toEqual([]);
  });

  it('Users_CrudRoundTrips', async () => {
    const repo = new SqlUserRepository({ db });
    await repo.add(user('u1', 'a@example.com'));
    expect(await repo.findByEmail('a@example.com')).toEqual(user('u1', 'a@example.com'));
    expect(await repo.findById('u1')).toMatchObject({ id: 'u1' });
    expect(await repo.findByEmail('none@example.com')).toBeNull();
    expect(await repo.remove('u1')).toBe(true);
    expect(await repo.remove('u1')).toBe(false);
    expect(await repo.findById('u1')).toBeNull();
  });

  it('PasswordResetTokens_SingleUseAndExpiry', async () => {
    let nowIso = '2026-01-01T00:00:00.000Z';
    const clock = {
      isoNow: () => nowIso,
      now: () => new Date(nowIso),
      today: () => nowIso.slice(0, 10),
    };
    const config = loadConfig({}); // 60-minute reset TTL
    const store = new SqlPasswordResetTokenStore({ db, clock, config });

    const t1 = await store.create('u1');
    expect(await store.consume(t1)).toBe('u1'); // single-use
    expect(await store.consume(t1)).toBeNull(); // already consumed

    // destroyForUser drops outstanding tokens
    await store.create('u1');
    await store.destroyForUser('u1');
    const other = await store.create('u2');
    expect(await store.consume(other)).toBe('u2');

    // expiry: a token past the TTL is rejected
    const old = await store.create('u3');
    nowIso = '2026-01-01T02:00:00.000Z'; // > 60 minutes later
    expect(await store.consume(old)).toBeNull();
  });

  it('EmailVerificationTokens_CreateConsumeDestroy_RespectExpiry', async () => {
    let nowIso = '2026-01-01T00:00:00.000Z';
    const clock = {
      isoNow: () => nowIso,
      now: () => new Date(nowIso),
      today: () => nowIso.slice(0, 10),
    };
    const config = loadConfig({}); // 60-minute TTL (shared with reset tokens)
    const store = new SqlEmailVerificationTokenStore({ db, clock, config });

    const t1 = await store.create('u1');
    expect(await store.consume(t1)).toBe('u1'); // single-use
    expect(await store.consume(t1)).toBeNull(); // already consumed

    // destroyForUser drops outstanding tokens
    await store.create('u1');
    await store.destroyForUser('u1');
    const other = await store.create('u2');
    expect(await store.consume(other)).toBe('u2');

    // expiry: a token past the TTL is rejected
    const old = await store.create('u3');
    nowIso = '2026-01-01T02:00:00.000Z'; // > 60 minutes later
    expect(await store.consume(old)).toBeNull();
  });

  it('WorkspaceSettings_RoundTrips_OwnerScoped', async () => {
    const store = new SqlWorkspaceSettingsStore({ db });
    await store.set('owner1', { vermittlung: true });
    expect(await store.get('owner1')).toEqual({ vermittlung: true });
    expect(await store.get('owner2')).toBeNull();

    // upsert overwrites
    await store.set('owner1', { vermittlung: false });
    expect(await store.get('owner1')).toEqual({ vermittlung: false });
  });

  it('Documents_RoundTrips_OwnerScopedWithCascade', async () => {
    const repo = new SqlDocumentRepository({ db });
    const docs = (
      talentId: string,
      ownerId = 'owner1',
      summary = 'A designer.',
    ): TalentDocuments => ({
      ownerId,
      talentId,
      contact: { name: 'Lena', role: 'Designer', email: '', phone: '', location: '', linkedin: '' },
      resume: { summary, experience: [], education: [], skillGroups: [] },
      letter: {
        firma: '',
        ansprechpartner: '',
        strasse: '',
        plzOrt: '',
        betreff: '',
        anrede: '',
        absaetze: ['x'],
        gruss: '',
      },
      style: {
        accent: '#2A6FDB',
        strong: '#1d4ed8',
        onDark: '#7aa7f5',
        font: 'var(--font-display)',
        size: 1,
      },
      updatedAt: '2026-06-25T10:00:00.000Z',
    });

    await repo.save(docs('t1'));
    await repo.save(docs('t2'));
    await repo.save(docs('t1', 'other'));

    expect(await repo.get('owner1', 't1')).toEqual(docs('t1'));
    expect(await repo.get('owner2', 't1')).toBeNull(); // owner-scoped

    // upsert overwrites by (owner, talent)
    await repo.save(docs('t1', 'owner1', 'Updated.'));
    expect((await repo.get('owner1', 't1'))?.resume.summary).toBe('Updated.');

    await repo.removeForTalent('owner1', 't1');
    expect(await repo.get('owner1', 't1')).toBeNull();
    expect(await repo.get('owner1', 't2')).not.toBeNull();

    await repo.removeForOwner('owner1');
    expect(await repo.get('owner1', 't2')).toBeNull();
    expect(await repo.get('other', 't1')).not.toBeNull(); // other owner untouched
  });

  it('Attachments_RoundTrips_BytesOwnerScopedWithCascade', async () => {
    const store = new SqlAttachmentStore({ db });
    const att = (id: string, talentId = 't1', ownerId = 'owner1') => ({
      id,
      ownerId,
      talentId,
      name: `${id}.pdf`,
      contentType: 'application/pdf',
      size: 5,
      createdAt: '2026-06-25T10:00:00.000Z',
    });
    await store.add(att('a1'), Buffer.from('%PDF-'));
    await store.add(att('a2', 't2'), Buffer.from('%PDF2'));
    await store.add(att('a3', 't1', 'other'), Buffer.from('%PDF3'));

    const blob = await store.get('owner1', 'a1');
    expect(blob?.bytes.toString()).toBe('%PDF-');
    expect(await store.get('owner2', 'a1')).toBeNull(); // owner-scoped
    expect((await store.list('owner1', 't1')).map((a) => a.id)).toEqual(['a1']);

    await store.removeForTalent('owner1', 't1');
    expect(await store.get('owner1', 'a1')).toBeNull();
    expect(await store.get('owner1', 'a2')).not.toBeNull();

    await store.removeForOwner('owner1');
    expect(await store.get('owner1', 'a2')).toBeNull();
    expect(await store.get('other', 'a3')).not.toBeNull(); // other owner untouched
  });

  it('SqlWorkspaceSettingsStore_SetThenGet_RoundTrips', async () => {
    const store = new SqlWorkspaceSettingsStore({ db });
    await store.set('ws-a', { vermittlung: true });
    expect(await store.get('ws-a')).toEqual({ vermittlung: true });

    // upsert overwrites
    await store.set('ws-a', { vermittlung: false });
    expect(await store.get('ws-a')).toEqual({ vermittlung: false });
  });

  it('SqlWorkspaceSettingsStore_UnknownWorkspace_ReturnsNull', async () => {
    const store = new SqlWorkspaceSettingsStore({ db });
    expect(await store.get('never-written')).toBeNull();
  });

  it('Migrate_LegacyRows_DeletedAndLegacyReadsSucceed', async () => {
    await pool.query("INSERT INTO api_keys (owner_id, provider, value) VALUES ('u1','claude','x')");
    await migrate(pool);

    const count = await pool.query('SELECT count(*)::int AS n FROM api_keys');
    expect(count.rows[0].n).toBe(0);
    // Expand/contract: the table still exists, so an old instance can still read.
    const read = await pool.query('SELECT * FROM api_keys');
    expect(read.rows).toEqual([]);
  });

  it('Migrate_RunTwice_IsIdempotent', async () => {
    await expect(migrate(pool)).resolves.toBeUndefined();
    await expect(migrate(pool)).resolves.toBeUndefined();
  });

  it('Migrate_RunConcurrentlyFromTwoPools_BothSucceed', async () => {
    const second = createDb(url as string);
    try {
      await expect(Promise.all([migrate(pool), migrate(second.pool)])).resolves.toBeDefined();
    } finally {
      await second.pool.end();
    }
  });

  it('Migrate_FreshDatabase_CreatesWorkspaceSettingsTable', async () => {
    const ws = await pool.query("SELECT to_regclass('workspace_settings') AS reg");
    expect(ws.rows[0].reg).not.toBeNull();
  });

  it('Migrate_FreshDatabase_CreatesJobPostingsTableAndIndexes', async () => {
    const table = await pool.query("SELECT to_regclass('job_postings') AS reg");
    expect(table.rows[0].reg).not.toBeNull();
    const indexes = await pool.query(
      "SELECT indexname FROM pg_indexes WHERE tablename = 'job_postings'",
    );
    const names = indexes.rows.map((r) => r.indexname as string);
    expect(names).toEqual(
      expect.arrayContaining([
        'job_postings_owner_id_idx',
        'job_postings_owner_source_idx',
        'job_postings_owner_url_idx',
      ]),
    );
  });

  it('Migrate_SavedSearchesOwnerId_BackfillsToTeam', async () => {
    // Simulate a pre-RI15 table: saved_searches without owner_id.
    await pool.query('DROP INDEX IF EXISTS saved_searches_owner_id_idx');
    await pool.query('ALTER TABLE saved_searches DROP COLUMN IF EXISTS owner_id');
    await pool.query(
      "INSERT INTO saved_searches (id, name, query, created_at) VALUES ('legacy', 'Rust', '{\"q\":\"Rust\",\"threshold\":70}'::jsonb, 'now')",
    );
    await migrate(pool);
    const row = await pool.query("SELECT owner_id FROM saved_searches WHERE id = 'legacy'");
    expect(row.rows[0].owner_id).toBe('team');
  });

  it('Migrate_UsersLlmProviderColumn_IsPreserved', async () => {
    const llm = await pool.query(
      "SELECT column_name FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'llm_provider'",
    );
    expect(llm.rows).toHaveLength(1);
  });
});
