import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import Database from 'better-sqlite3';
import { Pool } from 'pg';
import { betterAuth } from 'better-auth';
import { bearer } from 'better-auth/plugins/bearer';
import { getMigrations } from 'better-auth/db/migration';
import type { AuthEngine, AuthEngineSession, AuthEngineUser } from '../../ports/auth-engine.js';

/**
 * Better-Auth credential + session engine, backed by either an **embedded
 * SQLite** file (ADR-0043, the offline-first single-instance default) or a
 * **dedicated Postgres pool** (ADR-0043 update, #227) when `postgresUrl` is
 * given — which is the case whenever the app runs with `STORE=sql`. Better-Auth
 * builds on Kysely and auto-detects the dialect from what it's handed (a
 * `pg.Pool` → `PostgresDialect`, a `better-sqlite3.Database` → `SqliteDialect`),
 * so the only thing that changes between modes is which database object we
 * construct; every other line of this adapter is dialect-agnostic.
 *
 * Why this matters: `STORE=sql` is the flag the production-readiness gate
 * (`config-validation.ts`) already requires for a horizontally-scaled
 * deployment (the filesystem store can't be shared across instances) — but
 * until now credentials/sessions stayed on a **per-instance SQLite file**
 * regardless of that flag, so two app instances would each keep their own,
 * disjoint set of accounts. Sourcing Better-Auth's database from
 * `config.databaseUrl` (the same Postgres the rest of the app already uses via
 * `STORE=sql`) closes that gap: `STORE=sql` now means every store — including
 * auth — is actually shared.
 *
 * A dedicated `pg.Pool` (not the app's main Drizzle pool) is used deliberately:
 * Better-Auth's Kysely adapter owns whatever pool it's given (schema
 * migrations, its own connection lifecycle), so sharing the main pool object
 * would couple two independent consumers to one connection budget/lifecycle
 * for no benefit — a second, modestly-sized pool against the same database is
 * the standard way to embed a library like this alongside an existing
 * connection. This engine owns that pool and closes it via {@link close}.
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
 * by its own integration-style tests (real SQLite, and real Postgres gated on
 * `DATABASE_URL` like the other SQL adapters) rather than being
 * unit-coverage-counted — consistent with the sql/smtp/s3 adapters.
 */
export interface BetterAuthEngineOptions {
  /** SQLite file path, or `':memory:'` for tests. Ignored when `postgresUrl` is set. */
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
  /**
   * Postgres connection string (config.databaseUrl). When set, Better-Auth is
   * backed by a dedicated Postgres pool instead of the embedded SQLite file —
   * required for a horizontally-scaled deployment so every instance shares the
   * same credential/session store (#227). `dbPath` is ignored in this mode.
   */
  postgresUrl?: string;
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

  private constructor(
    private readonly auth: ReturnType<typeof betterAuth>,
    /** Set only when this engine created its own dedicated Postgres pool. */
    private readonly ownedPgPool?: Pool,
  ) {}

  /** Build the engine (synchronous). The schema is applied lazily on first use. */
  static create(opts: BetterAuthEngineOptions): BetterAuthEngine {
    let pgPool: Pool | undefined;
    let database: Database.Database | Pool;
    if (opts.postgresUrl) {
      pgPool = new Pool({ connectionString: opts.postgresUrl });
      database = pgPool;
    } else {
      if (opts.dbPath !== ':memory:') mkdirSync(dirname(opts.dbPath), { recursive: true });
      database = new Database(opts.dbPath);
    }
    const auth = betterAuth({
      database,
      secret: opts.secret,
      baseURL: opts.baseURL ?? 'http://localhost',
      emailAndPassword: { enabled: true },
      plugins: [bearer()],
      ...(opts.sessionTtlSeconds
        ? { session: { expiresIn: opts.sessionTtlSeconds, updateAge: opts.sessionTtlSeconds } }
        : {}),
    });
    return new BetterAuthEngine(auth as unknown as ReturnType<typeof betterAuth>, pgPool);
  }

  /** Close the dedicated Postgres pool, if this engine created one (no-op otherwise). */
  async close(): Promise<void> {
    await this.ownedPgPool?.end();
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
