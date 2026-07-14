import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { BetterAuthEngine } from '../../src/adapters/better-auth/better-auth-engine.js';

/**
 * Proves the Better-Auth + embedded-SQLite engine (ADR-0042) end to end: it
 * signs a credential up, verifies it, resolves a bearer token to its user,
 * rejects bad passwords, and revokes on sign-out — the contract `AuthService`
 * will consume in Stage 2. Runs against a real SQLite (`:memory:` and a temp
 * file), so it locks the actual framework behaviour, not a mock.
 */
describe('BetterAuthEngine', () => {
  const secret = 'test-secret-at-least-32-characters-long';
  let tmp: string;

  beforeAll(() => {
    tmp = mkdtempSync(join(tmpdir(), 'ba-engine-'));
  });
  afterAll(() => {
    rmSync(tmp, { recursive: true, force: true });
  });

  it('Engine_SignUp_ReturnsUserAndToken', async () => {
    const engine = await BetterAuthEngine.create({ dbPath: ':memory:', secret });
    const session = await engine.signUp('recruiter@myjob.de', 'sehr-geheim-123');
    expect(session.user.email).toBe('recruiter@myjob.de');
    expect(session.user.id).toBeTruthy();
    expect(session.token).toBeTruthy();
  });

  it('Engine_SignIn_VerifiesCredentialsAndOpensSession', async () => {
    const engine = await BetterAuthEngine.create({ dbPath: ':memory:', secret });
    await engine.signUp('a@myjob.de', 'passwort-123456');
    const session = await engine.signIn('a@myjob.de', 'passwort-123456');
    expect(session).not.toBeNull();
    expect(session?.user.email).toBe('a@myjob.de');
    expect(session?.token).toBeTruthy();
  });

  it('Engine_SignIn_WithWrongPassword_ReturnsNull', async () => {
    const engine = await BetterAuthEngine.create({ dbPath: ':memory:', secret });
    await engine.signUp('b@myjob.de', 'richtiges-passwort');
    expect(await engine.signIn('b@myjob.de', 'falsches-passwort')).toBeNull();
    expect(await engine.signIn('unbekannt@myjob.de', 'egal-egal-egal')).toBeNull();
  });

  it('Engine_Resolve_ReturnsTheSessionUser', async () => {
    const engine = await BetterAuthEngine.create({ dbPath: ':memory:', secret });
    const { token } = await engine.signUp('c@myjob.de', 'passwort-abcdef');
    const user = await engine.resolve(token);
    expect(user?.email).toBe('c@myjob.de');
  });

  it('Engine_Resolve_WithGarbageToken_ReturnsNull', async () => {
    const engine = await BetterAuthEngine.create({ dbPath: ':memory:', secret });
    expect(await engine.resolve('not-a-real-token')).toBeNull();
  });

  it('Engine_SignOut_InvalidatesTheSession', async () => {
    const engine = await BetterAuthEngine.create({ dbPath: ':memory:', secret });
    const { token } = await engine.signUp('d@myjob.de', 'passwort-ghijkl');
    expect(await engine.resolve(token)).not.toBeNull();
    await engine.signOut(token);
    expect(await engine.resolve(token)).toBeNull();
    // Idempotent — signing the same (now invalid) token out again must not throw.
    await expect(engine.signOut(token)).resolves.toBeUndefined();
  });

  it('Engine_PersistsCredentialsToTheSqliteFile', async () => {
    const dbPath = join(tmp, 'nested', 'auth.sqlite'); // also covers dir creation
    const first = await BetterAuthEngine.create({
      dbPath,
      secret,
      baseURL: 'http://localhost:3000',
    });
    await first.signUp('persist@myjob.de', 'passwort-persist');
    // A fresh engine over the same file must still verify the credential.
    const second = await BetterAuthEngine.create({ dbPath, secret });
    const session = await second.signIn('persist@myjob.de', 'passwort-persist');
    expect(session?.user.email).toBe('persist@myjob.de');
  });

  it('Engine_WithSessionTtlSeconds_StillSignsUpAndResolves', async () => {
    // Threading config.auth.sessionTtlMs (SESSION_TTL_DAYS) into Better-Auth's
    // own session.expiresIn must not break the ordinary flow.
    const engine = await BetterAuthEngine.create({
      dbPath: ':memory:',
      secret,
      sessionTtlSeconds: 3600,
    });
    const { token } = await engine.signUp('ttl@myjob.de', 'passwort-ttl-123');
    expect((await engine.resolve(token))?.email).toBe('ttl@myjob.de');
  });
});
