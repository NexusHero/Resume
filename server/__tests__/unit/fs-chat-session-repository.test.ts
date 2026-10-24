import { promises as fs } from 'node:fs';
import { mkdtempSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { AppConfig } from '../../src/config.js';
import type { ChatSession } from '../../src/domain/chat-agent.js';
import { FsChatSessionRepository } from '../../src/adapters/fs-chat-session-repository.js';

function tmpConfig(): AppConfig {
  const rootDir = mkdtempSync(path.join(os.tmpdir(), 'chat-sessions-'));
  return { chatSessionsFile: path.join(rootDir, 'bewerbungen', 'chat-sessions.json') } as AppConfig;
}

const session = (
  id: string,
  userId = 'u1',
  ownerId = 'team',
  over: Partial<ChatSession> = {},
): ChatSession => ({
  id,
  ownerId,
  userId,
  messages: [{ role: 'user', text: 'hi', createdAt: '2026-06-25T10:00:00.000Z' }],
  status: 'done',
  usage: { inputTokens: 0, outputTokens: 0, costUsd: 0 },
  createdAt: '2026-06-25T10:00:00.000Z',
  updatedAt: '2026-06-25T10:00:00.000Z',
  ...over,
});

describe('FsChatSessionRepository', () => {
  it('FsChatSessionRepository_AddThenList_ReturnsPerUser', async () => {
    const repo = new FsChatSessionRepository({ config: tmpConfig() });
    await repo.add(session('s1', 'u1'));
    await repo.add(session('s2', 'u2'));
    expect((await repo.list('team', 'u1')).map((s) => s.id)).toEqual(['s1']);
    expect(await repo.list('team', 'u2')).toHaveLength(1);
  });

  it('FsChatSessionRepository_MissingStatus_DefaultsDone', async () => {
    const config = tmpConfig();
    await fs.mkdir(path.dirname(config.chatSessionsFile), { recursive: true });
    const legacy = session('s1');
    const { status: _s, usage: _u, ...without } = legacy;
    void _s;
    void _u;
    await fs.writeFile(config.chatSessionsFile, JSON.stringify([without]));
    const repo = new FsChatSessionRepository({ config });
    const read = await repo.findById('team', 'u1', 's1');
    expect(read?.status).toBe('done');
    expect(read?.usage).toEqual({ inputTokens: 0, outputTokens: 0, costUsd: 0 });
  });

  it('FsChatSessionRepository_FindByIdOtherUser_ReturnsNull', async () => {
    const repo = new FsChatSessionRepository({ config: tmpConfig() });
    await repo.add(session('s1', 'u1'));
    expect(await repo.findById('team', 'u2', 's1')).toBeNull();
    expect(await repo.findById('other', 'u1', 's1')).toBeNull();
  });

  it('FsChatSessionRepository_DeleteOtherUser_Noop', async () => {
    const repo = new FsChatSessionRepository({ config: tmpConfig() });
    await repo.add(session('s1', 'u1'));
    expect(await repo.delete('team', 'u2', 's1')).toBe(false);
    expect(await repo.findById('team', 'u1', 's1')).not.toBeNull();
  });

  it('FsChatSessionRepository_Delete_RemovesOwn', async () => {
    const repo = new FsChatSessionRepository({ config: tmpConfig() });
    await repo.add(session('s1', 'u1'));
    expect(await repo.delete('team', 'u1', 's1')).toBe(true);
    expect(await repo.findById('team', 'u1', 's1')).toBeNull();
  });

  it('FsChatSessionRepository_SweepRunning_MarksAborted', async () => {
    const repo = new FsChatSessionRepository({ config: tmpConfig() });
    await repo.add(session('s1', 'u1', 'team', { status: 'running' }));
    await repo.add(session('s2', 'u1', 'team', { status: 'done' }));
    expect(await repo.sweepRunning('2026-06-25T11:00:00.000Z')).toBe(1);
    const swept = await repo.findById('team', 'u1', 's1');
    expect(swept?.status).toBe('aborted');
    expect(swept?.messages.some((m) => m.text === 'Lauf durch Neustart abgebrochen.')).toBe(true);
    expect((await repo.findById('team', 'u1', 's2'))?.status).toBe('done');
    // Idempotent: a second sweep finds nothing.
    expect(await repo.sweepRunning('2026-06-25T12:00:00.000Z')).toBe(0);
  });

  it('FsChatSessionRepository_RemoveForUser_ErasesAllScopes', async () => {
    const repo = new FsChatSessionRepository({ config: tmpConfig() });
    await repo.add(session('s1', 'u1', 'team'));
    await repo.add(session('s2', 'u1', 'other'));
    await repo.add(session('s3', 'u2', 'team'));
    await repo.removeForUser('u1');
    expect(await repo.list('team', 'u1')).toEqual([]);
    expect(await repo.list('other', 'u1')).toEqual([]);
    expect(await repo.list('team', 'u2')).toHaveLength(1);
  });

  it('FsChatSessionRepository_CorruptFile_ReturnsEmpty', async () => {
    const config = tmpConfig();
    await fs.mkdir(path.dirname(config.chatSessionsFile), { recursive: true });
    await fs.writeFile(config.chatSessionsFile, 'not json');
    const repo = new FsChatSessionRepository({ config });
    expect(await repo.list('team', 'u1')).toEqual([]);
  });

  it('FsChatSessionRepository_Update_InsertsWhenMissing', async () => {
    const repo = new FsChatSessionRepository({ config: tmpConfig() });
    await repo.update('team', 'u1', session('s1'));
    expect((await repo.findById('team', 'u1', 's1'))?.id).toBe('s1');
  });

  it('FsChatSessionRepository_ConcurrentWrites_AreSerialized', async () => {
    const repo = new FsChatSessionRepository({ config: tmpConfig() });
    await Promise.all(Array.from({ length: 25 }, (_, i) => repo.add(session(`s${i}`))));
    expect(await repo.list('team', 'u1')).toHaveLength(25);
  });
});
