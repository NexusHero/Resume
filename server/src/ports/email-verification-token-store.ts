/**
 * One-time, expiring email-verification tokens. Deliberately a separate store
 * from password-reset tokens: the two purposes must never be interchangeable
 * (a leaked verification link must not be able to set a new password).
 */
export interface EmailVerificationTokenStore {
  /** Mint a fresh opaque token bound to a user; returns the token. */
  create(userId: string): Promise<string>;
  /**
   * Validate and atomically consume a token: returns the owning user id if the
   * token exists and is within its TTL (deleting it so it can't be reused), or
   * null otherwise. Expired tokens are pruned.
   */
  consume(token: string): Promise<string | null>;
  /** Drop every outstanding token for a user (e.g. once verified). */
  destroyForUser(userId: string): Promise<void>;
}
