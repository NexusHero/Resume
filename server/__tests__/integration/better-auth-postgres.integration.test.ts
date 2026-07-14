import { Pool } from 'pg';
import { BetterAuthEngine } from '../../src/adapters/better-auth/better-auth-engine.js';

/**
 * Real-Postgres integration for the Better-Auth engine (#227). Skipped unless
 * DATABASE_URL is set, so the default (no DB, CI, pre-commit) stays green —
 * same gating as `sql-repositories.integration.test.ts`:
 *   DATABASE_URL=postgres://... npx jest better-auth-postgres
 *
 * Proves the actual scaling claim: two independently-constructed engines
 * (standing in for two app instances behind a load balancer) pointed at the
 * same Postgres see the same accounts and sessions — the gap #227 closes,
 * since the embedded-SQLite engine could never satisfy this.
 */
const url = process.env.DATABASE_URL;
const suite = url ? describe : describe.skip;

suite('BetterAuthEngine (real Postgres)', () => {
  const secret = 'test-secret-at-least-32-characters-long';
  let cleanupPool: Pool;
  const engines: BetterAuthEngine[] = [];

  const engine = (): BetterAuthEngine => {
    const e = BetterAuthEngine.create({ dbPath: ':memory:', secret, postgresUrl: url });
    engines.push(e);
    return e;
  };

  beforeAll(() => {
    cleanupPool = new Pool({ connectionString: url });
  });

  afterAll(async () => {
    await cleanupPool.end();
  });

  afterEach(async () => {
    await Promise.all(engines.splice(0).map((e) => e.close()));
    // Better-Auth's own schema (its default table names) — reset between tests
    // so each test starts from an empty credential store.
    await cleanupPool.query('TRUNCATE "session", "account", "verification", "user" CASCADE');
  });

  it('Engine_SignUp_ReturnsUserAndToken', async () => {
    const session = await engine().signUp('recruiter@myjob.de', 'sehr-geheim-123');
    expect(session.user.email).toBe('recruiter@myjob.de');
    expect(session.token).toBeTruthy();
  });

  it('Engine_SignIn_WithWrongPassword_ReturnsNull', async () => {
    const e = engine();
    await e.signUp('b@myjob.de', 'richtiges-passwort');
    expect(await e.signIn('b@myjob.de', 'falsches-passwort')).toBeNull();
  });

  it('TwoIndependentEngineInstances_ShareAccountsAndSessions', async () => {
    // Simulates two horizontally-scaled app instances behind a load balancer,
    // each with its own BetterAuthEngine (and its own dedicated pg.Pool) —
    // the exact scenario per-instance SQLite could not satisfy.
    const instanceA = engine();
    const instanceB = engine();

    const { token } = await instanceA.signUp('scaled@myjob.de', 'passwort-scaled-1');

    // A session opened on instance A resolves on instance B.
    const resolvedOnB = await instanceB.resolve(token);
    expect(resolvedOnB?.email).toBe('scaled@myjob.de');

    // A login attempted on instance B succeeds against the account instance A created.
    const signInOnB = await instanceB.signIn('scaled@myjob.de', 'passwort-scaled-1');
    expect(signInOnB?.user.email).toBe('scaled@myjob.de');

    // Signing out via instance B invalidates the session for instance A too.
    await instanceB.signOut(token);
    expect(await instanceA.resolve(token)).toBeNull();
  });

  it('Close_EndsTheDedicatedPoolWithoutThrowing', async () => {
    const e = engine();
    await e.signUp('closer@myjob.de', 'passwort-closer1');
    await expect(e.close()).resolves.toBeUndefined();
    engines.pop(); // already closed above; afterEach must not double-close it
  });
});
