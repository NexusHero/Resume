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
 * We drive Better-Auth **headlessly** via its server API (`auth.api.*`) plus its
 * internal adapter (for admin-style operations that need no request context),
 * and use the `bearer` plugin so a session is an opaque token we carry in our
 * own existing session cookie. That keeps the `/api/v1/auth` surface, the cookie
 * and every downstream consumer unchanged — only the engine behind `AuthService`
 * differs.
 *
 * Construction is synchronous (so it drops into the composition root like any
 * other adapter); the schema migration runs **lazily on first use** and once.
 *
 * Note: this wraps a third-party framework + a native module, so it is exercised
 * by its own integration-style test (real SQLite) rather than being
 * unit-coverage-counted — consistent with the sql/smtp/s3 adapters.
 */
export interface BetterAuthEngineOptions {
  /** SQLite file path, or `':memory:'` for tests. Parent dirs are created. */
  dbPath: string;
  /** Signing secret for sessions (reuse `APP_SECRET`). */
  secret: string;
  /** Only needed to satisfy Better-Auth; all calls here are server-side. */
  baseURL?: string;
  /**
   * Server-side session lifetime in seconds (config.auth.sessionTtlMs). Without
   * this Better-Auth applies its own default (7 days) regardless of
   * SESSION_TTL_DAYS, so the actual session lifetime silently disagreed with the
   * configured/cookie value.
   */
  sessionTtlSeconds?: number;
}

/** The subset of Better-Auth's api result we rely on (its full types are generic). */
interface EngineResult {
  token?: string;
  user: { id: string; email: string };
}
interface SessionResult {
  user: { id: string; email: string };
}
/** The internal-adapter surface we use (Better-Auth types it loosely). */
interface InternalContext {
  internalAdapter: {
    findUserByEmail(email: string): Promise<{ user: { id: string } } | null>;
    updatePassword(userId: string, hashedPassword: string): Promise<unknown>;
    deleteUserSessions(userId: string): Promise<unknown>;
    deleteUser(userId: string): Promise<unknown>;
  };
  password: { hash(plaintext: string): Promise<string> };
}

const bearerHeaders = (token: string): Headers => new Headers({ authorization: `Bearer ${token}` });

export class BetterAuthEngine implements AuthEngine {
  private migrated?: Promise<void>;

  private constructor(private readonly auth: ReturnType<typeof betterAuth>) {}

  /** Build the engine (synchronous). The schema is applied lazily on first use. */
  static create(opts: BetterAuthEngineOptions): BetterAuthEngine {
    if (opts.dbPath !== ':memory:') mkdirSync(dirname(opts.dbPath), { recursive: true });
    const auth = betterAuth({
      database: new Database(opts.dbPath),
      secret: opts.secret,
      baseURL: opts.baseURL ?? 'http://localhost',
      emailAndPassword: { enabled: true },
      plugins: [bearer()],
      ...(opts.sessionTtlSeconds
        ? { session: { expiresIn: opts.sessionTtlSeconds, updateAge: opts.sessionTtlSeconds } }
        : {}),
    });
    return new BetterAuthEngine(auth as unknown as ReturnType<typeof betterAuth>);
  }

  /** Apply Better-Auth's schema to the database, once, before the first operation. */
  private ensureMigrated(): Promise<void> {
    return (this.migrated ??= getMigrations(
      this.auth.options as unknown as Parameters<typeof getMigrations>[0],
    ).then(({ runMigrations }) => runMigrations()));
  }

  private async context(): Promise<InternalContext> {
    await this.ensureMigrated();
    return (await this.auth.$context) as unknown as InternalContext;
  }

  async signUp(email: string, password: string): Promise<AuthEngineSession> {
    await this.ensureMigrated();
    const res = (await this.auth.api.signUpEmail({
      body: { email, password, name: email },
      asResponse: false,
    })) as EngineResult;
    return { user: { id: res.user.id, email: res.user.email }, token: res.token ?? '' };
  }

  async signIn(email: string, password: string): Promise<AuthEngineSession | null> {
    await this.ensureMigrated();
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
    await this.ensureMigrated();
    const session = (await this.auth.api.getSession({
      headers: bearerHeaders(token),
    })) as SessionResult | null;
    if (!session?.user) return null;
    return { id: session.user.id, email: session.user.email };
  }

  async signOut(token: string): Promise<void> {
    await this.ensureMigrated();
    try {
      await this.auth.api.signOut({ headers: bearerHeaders(token) });
    } catch {
      // Already invalid/expired — logout is idempotent.
    }
  }

  async setPassword(email: string, newPassword: string): Promise<void> {
    const ctx = await this.context();
    const found = await ctx.internalAdapter.findUserByEmail(email);
    if (!found?.user) return;
    const hashed = await ctx.password.hash(newPassword);
    await ctx.internalAdapter.updatePassword(found.user.id, hashed);
  }

  async revokeSessions(email: string): Promise<void> {
    const ctx = await this.context();
    const found = await ctx.internalAdapter.findUserByEmail(email);
    if (found?.user) await ctx.internalAdapter.deleteUserSessions(found.user.id);
  }

  async erase(email: string): Promise<void> {
    const ctx = await this.context();
    const found = await ctx.internalAdapter.findUserByEmail(email);
    if (found?.user) await ctx.internalAdapter.deleteUser(found.user.id);
  }
}
