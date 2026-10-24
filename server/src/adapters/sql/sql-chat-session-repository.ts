import { and, eq } from 'drizzle-orm';
import type { ChatSession } from '../../domain/chat-agent.js';
import type { ChatSessionRepository } from '../../ports/chat-session-repository.js';
import type { Db } from './db.js';
import { chatSessions } from './schema.js';
import { chatSessionToRow, rowToChatSession } from './mappers.js';

/** Postgres-backed chat-session repository, `(ownerId, userId)`-scoped (AK-5.7). */
export class SqlChatSessionRepository implements ChatSessionRepository {
  private readonly db: Db;

  constructor(deps: { db: Db }) {
    this.db = deps.db;
  }

  async list(ownerId: string, userId: string): Promise<ChatSession[]> {
    const rows = await this.db
      .select()
      .from(chatSessions)
      .where(and(eq(chatSessions.ownerId, ownerId), eq(chatSessions.userId, userId)));
    return rows.map(rowToChatSession).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  async findById(ownerId: string, userId: string, id: string): Promise<ChatSession | null> {
    const rows = await this.db
      .select()
      .from(chatSessions)
      .where(
        and(
          eq(chatSessions.id, id),
          eq(chatSessions.ownerId, ownerId),
          eq(chatSessions.userId, userId),
        ),
      );
    return rows[0] ? rowToChatSession(rows[0]) : null;
  }

  async add(session: ChatSession): Promise<void> {
    await this.db.insert(chatSessions).values(chatSessionToRow(session));
  }

  async update(ownerId: string, userId: string, session: ChatSession): Promise<void> {
    const row = chatSessionToRow(session);
    const updated = await this.db
      .update(chatSessions)
      .set(row)
      .where(
        and(
          eq(chatSessions.id, session.id),
          eq(chatSessions.ownerId, ownerId),
          eq(chatSessions.userId, userId),
        ),
      )
      .returning({ id: chatSessions.id });
    // Match the file repository: an update to an unknown id inserts it.
    if (updated.length === 0) await this.db.insert(chatSessions).values(row);
  }

  async delete(ownerId: string, userId: string, id: string): Promise<boolean> {
    const deleted = await this.db
      .delete(chatSessions)
      .where(
        and(
          eq(chatSessions.id, id),
          eq(chatSessions.ownerId, ownerId),
          eq(chatSessions.userId, userId),
        ),
      )
      .returning({ id: chatSessions.id });
    return deleted.length > 0;
  }

  async removeForUser(userId: string): Promise<void> {
    await this.db.delete(chatSessions).where(eq(chatSessions.userId, userId));
  }

  async sweepRunning(at: string): Promise<number> {
    // Idempotent: load running rows, rewrite each as aborted + a system note.
    // An already-aborted row is never selected, so a second boot sweeps nothing.
    const rows = await this.db
      .select()
      .from(chatSessions)
      .where(eq(chatSessions.status, 'running'));
    for (const row of rows) {
      const session = rowToChatSession(row);
      const next: ChatSession = {
        ...session,
        status: 'aborted',
        messages: [
          ...session.messages,
          { role: 'system', text: 'Lauf durch Neustart abgebrochen.', createdAt: at },
        ],
        updatedAt: at,
      };
      await this.db
        .update(chatSessions)
        .set(chatSessionToRow(next))
        .where(eq(chatSessions.id, session.id));
    }
    return rows.length;
  }
}
