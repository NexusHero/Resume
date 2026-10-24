import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { AppConfig } from '../config.js';
import type { ChatSession } from '../domain/chat-agent.js';
import type { ChatSessionRepository } from '../ports/chat-session-repository.js';

/**
 * File-backed chat-session repository: the JSON array in
 * `archive/bewerbungen/chat-sessions.json` (pattern `fs-job-application-repository.ts`).
 * Every access is `(ownerId, userId)`-scoped (AK-5.7); writes are serialised
 * through an in-process mutex so concurrent incremental persists (one per tool
 * step, Owner Q5) cannot interleave a read-modify-write. Records written before
 * `status`/`usage` existed read as `status: 'done'` / zeroed usage.
 */
export class FsChatSessionRepository implements ChatSessionRepository {
  private readonly file: string;
  private readonly dir: string;
  private writeLock: Promise<void> = Promise.resolve();

  constructor(deps: { config: AppConfig }) {
    this.file = deps.config.chatSessionsFile;
    this.dir = path.dirname(this.file);
  }

  private async readAll(): Promise<ChatSession[]> {
    try {
      const raw = await fs.readFile(this.file, 'utf8');
      const data = JSON.parse(raw);
      if (!Array.isArray(data)) return [];
      return (data as ChatSession[]).map((s) => ({
        ...s,
        // Backward-compatible default (Plan §3.2).
        status: s.status ?? 'done',
        usage: s.usage ?? { inputTokens: 0, outputTokens: 0, costUsd: 0 },
        messages: Array.isArray(s.messages) ? s.messages : [],
      }));
    } catch {
      return [];
    }
  }

  private withLock<T>(fn: () => Promise<T>): Promise<T> {
    const run = this.writeLock.then(fn);
    this.writeLock = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }

  async list(ownerId: string, userId: string): Promise<ChatSession[]> {
    const all = await this.readAll();
    return all
      .filter((s) => s.ownerId === ownerId && s.userId === userId)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  async findById(ownerId: string, userId: string, id: string): Promise<ChatSession | null> {
    const all = await this.readAll();
    return all.find((s) => s.id === id && s.ownerId === ownerId && s.userId === userId) ?? null;
  }

  async add(session: ChatSession): Promise<void> {
    await this.withLock(async () => {
      const all = await this.readAll();
      all.push(session);
      await this.write(all);
    });
  }

  async update(ownerId: string, userId: string, session: ChatSession): Promise<void> {
    await this.withLock(async () => {
      const all = await this.readAll();
      const index = all.findIndex(
        (s) => s.id === session.id && s.ownerId === ownerId && s.userId === userId,
      );
      if (index < 0) all.push(session);
      else all[index] = session;
      await this.write(all);
    });
  }

  async delete(ownerId: string, userId: string, id: string): Promise<boolean> {
    return this.withLock(async () => {
      const all = await this.readAll();
      const remaining = all.filter(
        (s) => !(s.id === id && s.ownerId === ownerId && s.userId === userId),
      );
      if (remaining.length === all.length) return false;
      await this.write(remaining);
      return true;
    });
  }

  async removeForUser(userId: string): Promise<void> {
    await this.withLock(async () => {
      const all = await this.readAll();
      await this.write(all.filter((s) => s.userId !== userId));
    });
  }

  async sweepRunning(at: string): Promise<number> {
    return this.withLock(async () => {
      const all = await this.readAll();
      let swept = 0;
      const next = all.map((s) => {
        if (s.status !== 'running') return s;
        swept += 1;
        return {
          ...s,
          status: 'aborted' as const,
          messages: [
            ...s.messages,
            { role: 'system' as const, text: 'Lauf durch Neustart abgebrochen.', createdAt: at },
          ],
          updatedAt: at,
        };
      });
      if (swept > 0) await this.write(next);
      return swept;
    });
  }

  private async write(sessions: ChatSession[]): Promise<void> {
    await fs.mkdir(this.dir, { recursive: true });
    await fs.writeFile(this.file, JSON.stringify(sessions, null, 2) + '\n');
  }
}
