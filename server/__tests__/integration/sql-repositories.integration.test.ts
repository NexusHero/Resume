import type { Pool } from 'pg';
import { createDb, migrate, type Db } from '../../src/adapters/sql/db';
import { SqlApplicationRepository } from '../../src/adapters/sql/sql-application-repository';
import { SqlAuditLog } from '../../src/adapters/sql/sql-audit-log';
import { SqlSavedSearchRepository } from '../../src/adapters/sql/sql-saved-search-repository';
import type { Application, AuditEvent } from '../../src/domain/application';
import type { SavedSearch } from '../../src/domain/saved-search';

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
    await pool.query('TRUNCATE applications, audit_events, saved_searches RESTART IDENTITY');
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
});
