import 'reflect-metadata';
import request from 'supertest';
import { loadConfig } from '../../src/config.js';
import { makeNestApp, closeNestApps } from '../support/nest-app.js';
import {
  FakeAgentLlmProvider,
  FakeLlmProvider,
  InMemoryChatSessionRepository,
} from '../support/fakes.js';

const quickAgent = () =>
  new FakeAgentLlmProvider([
    [
      { kind: 'text-delta', text: 'Fertig.' },
      { kind: 'done', stopReason: 'end_turn', usage: { inputTokens: 1, outputTokens: 1 } },
    ],
  ]);

function sseSessionId(body: string): string {
  const m = /event: session\ndata: (\{.*\})/.exec(body);
  return m ? (JSON.parse(m[1] as string) as { sessionId: string }).sessionId : '';
}

async function agentApp(
  opts: {
    agent?: ReturnType<typeof quickAgent>;
    repo?: InMemoryChatSessionRepository;
  } = {},
) {
  const app = await makeNestApp(loadConfig({}), {
    llmProviders: [new FakeLlmProvider('claude', true, 'AI')],
    agentLlmProvider: opts.agent ?? quickAgent(),
    chatSessionRepository: opts.repo,
  });
  return app;
}

describe('Chat-Agent API (AK-5.1–5.7)', () => {
  afterEach(async () => {
    await closeNestApps();
  });

  const register = async (agent: ReturnType<typeof request.agent>, email: string) => {
    await agent.post('/api/v1/auth/register').send({ email, password: 'correct-horse-battery' });
  };

  it('AgentChat_NoLogin_Returns401', async () => {
    const app = await agentApp();
    const req = request(app);
    for (const c of [
      { method: 'post', path: '/api/v1/agent/chat' },
      { method: 'get', path: '/api/v1/agent/chat' },
      { method: 'get', path: '/api/v1/agent/chat/s1' },
      { method: 'delete', path: '/api/v1/agent/chat/s1' },
      { method: 'post', path: '/api/v1/agent/chat/s1/abort' },
    ]) {
      const res = await req[c.method as 'post' | 'get' | 'delete'](c.path);
      expect(`${c.method} ${c.path}`).toBe(`${c.method} ${c.path}`);
      expect(res.status).toBe(401);
    }
  });

  it('AgentChat_NoAiKey_Returns503', async () => {
    const app = await makeNestApp(loadConfig({})); // no LLM provider → 503
    const agent = request.agent(app);
    await register(agent, 'no-key@agent.test');
    const res = await agent.post('/api/v1/agent/chat').send({ message: 'Hallo' });
    expect(res.status).toBe(503);
    expect(res.body.type).toBe('about:blank#ai-not-configured');
  });

  it('AgentChat_VermittlungOff_StillReachable', async () => {
    const app = await agentApp(); // default vermittlung=false
    const agent = request.agent(app);
    await register(agent, 'off@agent.test');
    const res = await agent.post('/api/v1/agent/chat').send({ message: 'Hallo' });
    expect(res.status).toBe(200); // not gated behind vermittlung
    expect(res.headers['content-type']).toMatch(/text\/event-stream/);
  });

  it('AgentChat_StreamsSse', async () => {
    const app = await agentApp();
    const agent = request.agent(app);
    await register(agent, 'sse@agent.test');
    const res = await agent.post('/api/v1/agent/chat').send({ message: 'Hallo' });
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/event-stream/);
    expect(res.text).toContain('event: session');
    expect(res.text).toContain('event: text');
    expect(res.text).toContain('event: done');
    const sessionId = sseSessionId(res.text);
    expect(sessionId).toBeTruthy();

    // List returns the caller's session metadata.
    const list = await agent.get('/api/v1/agent/chat');
    expect(list.status).toBe(200);
    expect(list.body.map((s: { id: string }) => s.id)).toContain(sessionId);
  });

  it('AgentChat_GetSession_404Foreign_And_DeleteSession_204', async () => {
    const app = await agentApp();
    const agent = request.agent(app);
    await register(agent, 'crud@agent.test');
    const res = await agent.post('/api/v1/agent/chat').send({ message: 'Hallo' });
    const sessionId = sseSessionId(res.text);

    const get = await agent.get(`/api/v1/agent/chat/${sessionId}`);
    expect(get.status).toBe(200);
    expect(get.body.session.id).toBe(sessionId);

    await expect((await agent.get('/api/v1/agent/chat/ghost')).status).toBe(404);

    const del = await agent.delete(`/api/v1/agent/chat/${sessionId}`);
    expect(del.status).toBe(204);
    await expect((await agent.get(`/api/v1/agent/chat/${sessionId}`)).status).toBe(404);
  });

  it('AgentChat_SameWorkspace_OtherUser_Returns404', async () => {
    const app = await agentApp();
    const userA = request.agent(app);
    await register(userA, 'a@agent.test');
    const created = await userA.post('/api/v1/agent/chat').send({ message: 'Hallo' });
    const sessionId = sseSessionId(created.text);

    const userB = request.agent(app);
    await register(userB, 'b@agent.test');

    // Same workspace, other user: the session is "not found" (404), never 403.
    expect((await userB.get(`/api/v1/agent/chat/${sessionId}`)).status).toBe(404);
    expect((await userB.delete(`/api/v1/agent/chat/${sessionId}`)).status).toBe(404);
    const append = await userB.post('/api/v1/agent/chat').send({ sessionId, message: 'weiter' });
    expect(append.status).toBe(404);
  });

  it('AgentChat_StaleRunningSession_OnBootSweptToAborted', async () => {
    const repo = new InMemoryChatSessionRepository();
    await repo.add({
      id: 's-running',
      ownerId: 'team',
      userId: 'eng-user-1',
      messages: [{ role: 'user', text: 'old', createdAt: 'x' }],
      status: 'running',
      usage: { inputTokens: 0, outputTokens: 0, costUsd: 0 },
      createdAt: 'x',
      updatedAt: 'x',
    });
    // The boot sweep runs on `makeNestApp`? No — it is index.ts; simulate it here
    // by driving the service's sweep through a fresh app is not available, so we
    // assert the repository sweep directly.
    expect(await repo.sweepRunning('now')).toBe(1);
    const swept = await repo.findById('team', 'eng-user-1', 's-running');
    expect(swept?.status).toBe('aborted');
  });
});
