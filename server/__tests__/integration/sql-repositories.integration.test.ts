import type { Pool } from 'pg';
import { createDb, migrate, type Db } from '../../src/adapters/sql/db';
import { SqlApplicationRepository } from '../../src/adapters/sql/sql-application-repository';
import { SqlAuditLog } from '../../src/adapters/sql/sql-audit-log';
import { SqlSavedSearchRepository } from '../../src/adapters/sql/sql-saved-search-repository';
import { SqlMandateRepository } from '../../src/adapters/sql/sql-mandate-repository';
import { SqlTalentRepository } from '../../src/adapters/sql/sql-talent-repository';
import { SqlPlacementRepository } from '../../src/adapters/sql/sql-placement-repository';
import { SqlUserRepository } from '../../src/adapters/sql/sql-user-repository';
import { SqlSessionStore } from '../../src/adapters/sql/sql-session-store';
import { SqlPasswordResetTokenStore } from '../../src/adapters/sql/sql-password-reset-token-store';
import { SqlApiKeyStore } from '../../src/adapters/sql/sql-api-key-store';
import { SqlDocumentRepository } from '../../src/adapters/sql/sql-document-repository';
import { SqlAttachmentStore } from '../../src/adapters/sql/sql-attachment-store';
import { SecretCipher } from '../../src/adapters/secret-cipher';
import { loadConfig } from '../../src/config';
import type { Application, AuditEvent } from '../../src/domain/application';
import type { SavedSearch } from '../../src/domain/saved-search';
import type { Mandate } from '../../src/domain/mandate';
import type { Talent } from '../../src/domain/talent';
import type { Placement } from '../../src/domain/placement';
import type { User } from '../../src/domain/user';
import type { TalentDocuments } from '../../src/domain/talent-documents';

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
      'TRUNCATE applications, audit_events, saved_searches, mandates, talents, placements, talent_documents, attachments, users, sessions, password_reset_tokens, api_keys RESTART IDENTITY',
    );
  });

  const user = (id: string, email = `${id}@example.com`): User => ({
    id,
    email,
    passwordHash: 'scrypt$salt$key',
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

  const app = (id: string, company = 'Aurora'): Application => ({
    id,
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

  it('Applications_AddFindUpdate_RoundTrips', async () => {
    const repo = new SqlApplicationRepository({ db });
    await repo.add(app('a1'));
    expect(await repo.findById('a1')).toMatchObject({ id: 'a1', company: 'Aurora' });
    expect(await repo.findById('missing')).toBeNull();

    await repo.update({ ...app('a1', 'New'), status: 'interview', commit: 'abc1234' });
    const updated = await repo.findById('a1');
    expect(updated).toMatchObject({ company: 'New', status: 'interview', commit: 'abc1234' });
    expect(await repo.list()).toHaveLength(1);
  });

  it('Applications_UpdateUnknown_Inserts', async () => {
    const repo = new SqlApplicationRepository({ db });
    await repo.update(app('a9'));
    expect(await repo.list()).toHaveLength(1);
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
      name: 'Rust',
      query: { q: 'Rust', threshold: 70 },
      createdAt: 'now',
    };
    await repo.add(search);
    expect(await repo.list()).toEqual([search]);
    expect(await repo.findById('s1')).toEqual(search);
    expect(await repo.remove('s1')).toBe(true);
    expect(await repo.remove('s1')).toBe(false);
    expect(await repo.list()).toEqual([]);
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
    await repo.updatePassword('u1', 'scrypt$new$hash');
    expect((await repo.findById('u1'))!.passwordHash).toBe('scrypt$new$hash');
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

  it('Sessions_CreateLookupDestroy_RespectExpiry', async () => {
    let nowIso = '2026-01-01T00:00:00.000Z';
    const clock = {
      isoNow: () => nowIso,
      now: () => new Date(nowIso),
      today: () => nowIso.slice(0, 10),
    };
    const config = loadConfig({}); // 30-day TTL
    const store = new SqlSessionStore({ db, clock, config });

    const a1 = await store.create('u1');
    const a2 = await store.create('u1');
    const b1 = await store.create('u2');
    expect(await store.userIdFor(a1)).toBe('u1');

    // destroyForUser removes only that user's sessions
    await store.destroyForUser('u1');
    expect(await store.userIdFor(a1)).toBeNull();
    expect(await store.userIdFor(a2)).toBeNull();
    expect(await store.userIdFor(b1)).toBe('u2');

    // expiry: a session past the TTL is rejected and pruned
    const old = await store.create('u3');
    nowIso = '2026-03-01T00:00:00.000Z'; // > 30 days later
    expect(await store.userIdFor(old)).toBeNull();

    await store.destroy(b1);
    expect(await store.userIdFor(b1)).toBeNull();
  });

  it('ApiKeys_EncryptedRoundTrip_OwnerScoped', async () => {
    const cipher = new SecretCipher({ config: loadConfig({}) });
    const store = new SqlApiKeyStore({ db, secretCipher: cipher });
    await store.set('owner1', 'claude', 'sk-ant-secret');
    await store.set('owner1', 'gemini', 'sk-gem');
    await store.set('other', 'claude', 'sk-other');

    expect(await store.get('owner1', 'claude')).toBe('sk-ant-secret');
    expect(await store.get('owner2', 'claude')).toBeNull();
    expect((await store.providersFor('owner1')).sort()).toEqual(['claude', 'gemini']);

    // stored value is ciphertext, not the plaintext key
    const raw = await pool.query('SELECT value FROM api_keys WHERE owner_id=$1 AND provider=$2', [
      'owner1',
      'claude',
    ]);
    expect(raw.rows[0].value).not.toContain('sk-ant-secret');

    // upsert overwrites
    await store.set('owner1', 'claude', 'sk-ant-new');
    expect(await store.get('owner1', 'claude')).toBe('sk-ant-new');

    expect(await store.remove('owner1', 'claude')).toBe(true);
    expect(await store.remove('owner1', 'claude')).toBe(false);
    expect(await store.get('owner1', 'claude')).toBeNull();
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
});
