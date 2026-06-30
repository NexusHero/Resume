/** One-time, expiring password-reset tokens. */
export interface PasswordResetTokenStore {
  /** Mint a fresh opaque token bound to a user; returns the token. */
  create(userId: string): Promise<string>;
  /**
   * Validate and atomically consume a token: returns the owning user id if the
   * token exists and is within its TTL (deleting it so it can't be reused), or
   * null otherwise. Expired tokens are pruned.
   */
  consume(token: string): Promise<string | null>;
  /** Drop every outstanding token for a user (e.g. after a successful reset). */
  destroyForUser(userId: string): Promise<void>;
}
