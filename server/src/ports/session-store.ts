/** Opaque server-side sessions: a token maps to a user id. */
export interface SessionStore {
  create(userId: string): Promise<string>;
  userIdFor(token: string): Promise<string | null>;
  destroy(token: string): Promise<void>;
  /** Drop every session for a user — used on account erasure (DSGVO). */
  destroyForUser(userId: string): Promise<void>;
}
