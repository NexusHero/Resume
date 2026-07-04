import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import Database from 'better-sqlite3';
import { betterAuth } from 'better-auth';
import { bearer } from 'better-auth/plugins/bearer';
import { getMigrations } from 'better-auth/db/migration';
import type { AuthEngine, AuthEngineSession, AuthEngineUser } from '../../ports/auth-engine.js';

/**
 * Better-Auth credential + session engine backed by **embedded SQLite**
 * (ADR-0043). Better-Auth is a self-hosted framework with no external service,
 * and better-sqlite3 is a local file — so the offline-first property (ADR-0003)
 * is preserved: no server, no network, just a file next to the JSON store.
 *
 * We drive Better-Auth **headlessly** via its server API (`auth.api.*`) rather
 * than mounting its HTTP handler, and use the `bearer` plugin so a session is an
 * opaque token we can carry in our own existing session cookie. That keeps the
 * `/api/v1/auth` surface, the cookie and every downstream consumer unchanged —
 * only the engine behind `AuthService` differs.
 *
 * Note: this wraps a third-party framework + a native module, so it is exercised
 * by its own integration-style test (and Stage 2's flows) rather than being
 * unit-coverage-counted — consistent with the sql/smtp/s3 adapters.
 */
export interface BetterAuthEngineOptions {
  /** SQLite file path, or `':memory:'` for tests. Parent dirs are created. */
  dbPath: string;
  /** Signing secret for sessions (reuse `APP_SECRET`). */
  secret: string;
  /** Only needed to satisfy Better-Auth; all calls here are server-side. */
  baseURL?: string;
}

/** The subset of Better-Auth's api result we rely on (its full types are generic). */
interface EngineResult {
  token?: string;
  user: { id: string; email: string };
}
interface SessionResult {
  user: { id: string; email: string };
}

const bearerHeaders = (token: string): Headers => new Headers({ authorization: `Bearer ${token}` });

export class BetterAuthEngine implements AuthEngine {
  private constructor(private readonly auth: ReturnType<typeof betterAuth>) {}

  /**
   * Build the engine and apply Better-Auth's schema to the SQLite database
   * (idempotent). Async because the migration runs once at construction.
   */
  static async create(opts: BetterAuthEngineOptions): Promise<BetterAuthEngine> {
    if (opts.dbPath !== ':memory:') mkdirSync(dirname(opts.dbPath), { recursive: true });
    const auth = betterAuth({
      database: new Database(opts.dbPath),
      secret: opts.secret,
      baseURL: opts.baseURL ?? 'http://localhost',
      emailAndPassword: { enabled: true },
      plugins: [bearer()],
    });
    // Better-Auth's deep generics don't line up structurally with getMigrations'
    // widened `BetterAuthOptions` param, so cast. The runtime value is the correct
    // resolved options — verified end-to-end by better-auth-engine.test.ts.
    const { runMigrations } = await getMigrations(
      auth.options as unknown as Parameters<typeof getMigrations>[0],
    );
    await runMigrations();
    // `auth` is inferred with a narrower options literal than the general
    // ReturnType<typeof betterAuth>; same runtime value.
    return new BetterAuthEngine(auth as unknown as ReturnType<typeof betterAuth>);
  }

  async signUp(email: string, password: string): Promise<AuthEngineSession> {
    const res = (await this.auth.api.signUpEmail({
      body: { email, password, name: email },
      asResponse: false,
    })) as EngineResult;
    return { user: { id: res.user.id, email: res.user.email }, token: res.token ?? '' };
  }

  async signIn(email: string, password: string): Promise<AuthEngineSession | null> {
    try {
      const res = (await this.auth.api.signInEmail({
        body: { email, password },
        asResponse: false,
      })) as EngineResult;
      return { user: { id: res.user.id, email: res.user.email }, token: res.token ?? '' };
    } catch {
      return null; // invalid email or password
    }
  }

  async resolve(token: string): Promise<AuthEngineUser | null> {
    const session = (await this.auth.api.getSession({
      headers: bearerHeaders(token),
    })) as SessionResult | null;
    if (!session?.user) return null;
    return { id: session.user.id, email: session.user.email };
  }

  async signOut(token: string): Promise<void> {
    try {
      await this.auth.api.signOut({ headers: bearerHeaders(token) });
    } catch {
      // Already invalid/expired — logout is idempotent.
    }
  }
}
