/**
 * The credential + session engine (ADR-0043).
 *
 * A deliberately narrow boundary around "verify a password, issue and resolve an
 * opaque session token" — implemented by Better-Auth on embedded SQLite. It
 * replaced the original hand-rolled pair (scrypt hasher + `SessionStore`), which
 * has since been removed; the port stays so a different engine could be swapped
 * in without the app learning which is wired.
 *
 * The engine owns *credentials and sessions only*. The domain `User`
 * (roles, tenant, profile) stays in `UserRepository` — the two are linked by
 * email. This keeps the offline file/SQL store as the source of truth for
 * everything the business logic cares about, while delegating the security-
 * critical crypto to an audited framework.
 */

/** A user as the engine knows it: an id and an email (no roles/tenant here). */
export interface AuthEngineUser {
  /** The engine's own user id (distinct from the domain User id; linked by email). */
  id: string;
  email: string;
}

/** The result of opening a session: the user plus an opaque bearer token. */
export interface AuthEngineSession {
  user: AuthEngineUser;
  /** Opaque token the caller stores in its own session cookie. */
  token: string;
}

export interface AuthEngine {
  /** Create a credential and open a first session. Throws on a duplicate email. */
  signUp(email: string, password: string): Promise<AuthEngineSession>;
  /** Verify a credential and open a session; `null` on bad email/password. */
  signIn(email: string, password: string): Promise<AuthEngineSession | null>;
  /** Resolve a bearer token to its user; `null` if unknown, expired or revoked. */
  resolve(token: string): Promise<AuthEngineUser | null>;
  /** Revoke a single session (logout). Idempotent — an unknown token is a no-op. */
  signOut(token: string): Promise<void>;
  /** Set a new password for the account. No-op if the email is unknown. */
  setPassword(email: string, newPassword: string): Promise<void>;
  /** Revoke every session for the account (used after a password reset). */
  revokeSessions(email: string): Promise<void>;
  /** Remove the account entirely — credential + all sessions (DSGVO erasure). */
  erase(email: string): Promise<void>;
  /** Release any resources this engine owns (e.g. a dedicated pool). Optional — implementations without one can omit it. */
  close?(): Promise<void>;
}
