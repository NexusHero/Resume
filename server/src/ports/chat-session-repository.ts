import type { ChatSession } from '../domain/chat-agent.js';

/**
 * Persistence of chat sessions, scoped by **workspace and user** (AK-5.7,
 * Major-Fix): every access — `list`, `findById`, `update`, `delete` — is
 * `(ownerId, userId)`-bound, so one user never sees another's session even in
 * the same workspace (a foreign session reads as "not found", 404).
 */
export interface ChatSessionRepository {
  /** The caller's own sessions, newest-first by `updatedAt`. */
  list(ownerId: string, userId: string): Promise<ChatSession[]>;
  findById(ownerId: string, userId: string, id: string): Promise<ChatSession | null>;
  /** The session already carries `ownerId` + `userId`. */
  add(session: ChatSession): Promise<void>;
  update(ownerId: string, userId: string, session: ChatSession): Promise<void>;
  /** Remove an owned session. Returns false when no such record exists. */
  delete(ownerId: string, userId: string, id: string): Promise<boolean>;
  /** Remove every session a user owns (DSGVO account erasure). */
  removeForUser(userId: string): Promise<void>;
  /**
   * Idempotent boot sweep (Running-Recovery, §3.5): mark every persisted
   * `status === 'running'` session `aborted` and append a system note. Returns
   * the number of sessions swept. Not user-scoped — it is a maintenance
   * operation that runs once per boot across every workspace/user.
   */
  sweepRunning(at: string): Promise<number>;
}
