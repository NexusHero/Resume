import { jest } from '@jest/globals';
import {
  buildAgentMessages,
  ChatAgentService,
  type ChatAgentEvent,
  type ChatAgentEmitter,
} from '../../src/services/chat-agent-service.js';
import { AgentToolService } from '../../src/services/agent-tool-service.js';
import type { ChatSession } from '../../src/domain/chat-agent.js';
import type { AgentLlmProvider } from '../../src/ports/agent-llm-provider.js';
import {
  FakeAgentLlmProvider,
  InMemoryChatSessionRepository,
  InMemoryUsageMeter,
  FixedClock,
  SequenceIdGenerator,
  noopLogger,
} from '../support/fakes.js';

function makeToolService(dispatch: jest.Mock = jest.fn()) {
  return { dispatch } as unknown as AgentToolService;
}

async function runToCompletion(
  service: ChatAgentService,
  scope: string,
  userId: string,
  message: string,
  sessionId?: string,
): Promise<{ session: ChatSession; events: ChatAgentEvent[] }> {
  const session = await service.prepare(scope, userId, {
    message,
    ...(sessionId ? { sessionId } : {}),
  });
  const events: ChatAgentEvent[] = [];
  const emit: ChatAgentEmitter = (ev) => {
    events.push(ev);
  };
  await service.run(scope, userId, session, emit);
  return { session, events };
}

const names = (events: ChatAgentEvent[]): string[] => events.map((e) => e.name);

describe('buildAgentMessages', () => {
  it('GroupsAssistantToolCallsAndToolResults', () => {
    const parts = buildAgentMessages([
      { role: 'user', text: 'hi', createdAt: 't0' },
      { role: 'assistant', text: 'looking', createdAt: 't1' },
      { role: 'assistant', toolCall: { id: 'c1', name: 'search_jobs', args: {} }, createdAt: 't2' },
      { role: 'assistant', toolCall: { id: 'c2', name: 'save_job', args: {} }, createdAt: 't3' },
      {
        role: 'tool',
        toolResult: { toolCallId: 'c1', name: 'search_jobs', content: 'x' },
        createdAt: 't4',
      },
      {
        role: 'tool',
        toolResult: { toolCallId: 'c2', name: 'save_job', content: 'y' },
        createdAt: 't5',
      },
    ]);
    expect(parts).toEqual([
      { role: 'user', text: 'hi' },
      {
        role: 'assistant',
        text: 'looking',
        toolCalls: [
          { id: 'c1', name: 'search_jobs', input: {} },
          { id: 'c2', name: 'save_job', input: {} },
        ],
      },
      {
        role: 'user',
        toolResults: [
          { toolCallId: 'c1', name: 'search_jobs', content: 'x' },
          { toolCallId: 'c2', name: 'save_job', content: 'y' },
        ],
      },
    ]);
  });

  it('SkipsSystemMessages', () => {
    const parts = buildAgentMessages([
      { role: 'system', text: 'note', createdAt: 't0' },
      { role: 'user', text: 'hi', createdAt: 't1' },
    ]);
    expect(parts).toEqual([{ role: 'user', text: 'hi' }]);
  });

  it('SkipsOrphanToolMessage', () => {
    const parts = buildAgentMessages([
      { role: 'tool', toolResult: { toolCallId: 'c1', name: 'x', content: 'y' }, createdAt: 't0' },
      { role: 'user', text: 'hi', createdAt: 't1' },
    ]);
    expect(parts).toEqual([{ role: 'user', text: 'hi' }]);
  });
});

describe('ChatAgentService', () => {
  function makeService(
    opts: {
      provider?: AgentLlmProvider;
      dispatch?: jest.Mock;
      budgets?: Partial<{
        maxSteps: number;
        maxApplications: number;
        maxTokens: number;
        maxTimeMs: number;
      }>;
      repo?: InMemoryChatSessionRepository;
      meter?: InMemoryUsageMeter;
    } = {},
  ) {
    const repo = opts.repo ?? new InMemoryChatSessionRepository();
    const meter = opts.meter ?? new InMemoryUsageMeter();
    const service = new ChatAgentService({
      agentLlmProvider:
        opts.provider ??
        new FakeAgentLlmProvider([
          [
            { kind: 'text-delta', text: 'ok' },
            { kind: 'done', stopReason: 'end_turn', usage: { inputTokens: 1, outputTokens: 1 } },
          ],
        ]),
      chatSessionRepository: repo,
      agentToolService: makeToolService(opts.dispatch),
      usageMeter: meter,
      clock: new FixedClock(),
      idGenerator: new SequenceIdGenerator('chat'),
      logger: noopLogger,
      budgets: {
        maxSteps: 25,
        maxApplications: 5,
        maxTokens: 100_000,
        maxTimeMs: 120_000,
        ...opts.budgets,
      },
    });
    return { service, repo, meter };
  }

  it('ChatAgentService_Run_StreamsTextAndToolSteps', async () => {
    const dispatch = jest.fn(async () => [{ id: 't1', name: 'Ada' }]);
    const provider = new FakeAgentLlmProvider([
      [
        { kind: 'text-delta', text: 'Ich schaue nach.' },
        { kind: 'tool-use', id: 'c1', name: 'list_mandanten', input: {} },
        { kind: 'done', stopReason: 'tool_use', usage: { inputTokens: 10, outputTokens: 20 } },
      ],
      [
        { kind: 'text-delta', text: 'Fertig.' },
        { kind: 'done', stopReason: 'end_turn', usage: { inputTokens: 5, outputTokens: 5 } },
      ],
    ]);
    const { service } = makeService({ provider, dispatch });
    const { session, events } = await runToCompletion(service, 'team', 'u1', 'Hallo');
    expect(names(events)).toContain('text');
    expect(names(events)).toContain('tool-call');
    expect(names(events)).toContain('tool-result');
    expect(names(events).slice(-3)).toEqual(['drafts', 'usage', 'done']);
    expect(session.status).toBe('done');
    expect(dispatch).toHaveBeenCalledWith('team', 'u1', 'list_mandanten', {});
  });

  it('ChatAgentService_ToolError_ReturnsIsErrorResultAndContinues', async () => {
    const dispatch = jest.fn(async () => {
      throw new Error('boom');
    });
    const provider = new FakeAgentLlmProvider([
      [
        { kind: 'tool-use', id: 'c1', name: 'search_jobs', input: { q: 'x' } },
        { kind: 'done', stopReason: 'tool_use', usage: { inputTokens: 1, outputTokens: 1 } },
      ],
      [
        { kind: 'text-delta', text: 'ok' },
        { kind: 'done', stopReason: 'end_turn', usage: { inputTokens: 1, outputTokens: 1 } },
      ],
    ]);
    const { service } = makeService({ provider, dispatch });
    const { session, events } = await runToCompletion(service, 'team', 'u1', 'Hallo');
    expect(names(events)).toContain('tool-error');
    expect(session.status).toBe('done'); // the run continues after a failed tool
    const failed = session.messages.find((m) => m.toolResult?.isError);
    expect(failed).toBeDefined();
  });

  it('ChatAgentService_ProviderFailure_EndsRunAsError', async () => {
    const provider: AgentLlmProvider = {
      id: 'claude',
      streamAgentTurn: () => ({
        [Symbol.asyncIterator]: () => ({
          next: () => Promise.reject(new Error('upstream down')),
        }),
      }),
    };
    const { service } = makeService({ provider });
    const { session, events } = await runToCompletion(service, 'team', 'u1', 'Hallo');
    expect(names(events)).toContain('error');
    expect(session.status).toBe('error');
  });

  it('ChatAgentService_MaxStepsReached_StopsAndSummarizes', async () => {
    const dispatch = jest.fn(async () => ({}));
    // One tool call per round, repeated forever.
    const provider = new FakeAgentLlmProvider([
      [
        { kind: 'tool-use', id: 'c1', name: 'list_mandanten', input: {} },
        { kind: 'done', stopReason: 'tool_use', usage: { inputTokens: 1, outputTokens: 1 } },
      ],
    ]);
    const { service } = makeService({ provider, dispatch, budgets: { maxSteps: 2 } });
    const { session, events } = await runToCompletion(service, 'team', 'u1', 'Hallo');
    const limit = events.find((e) => e.name === 'limit');
    expect(limit).toBeDefined();
    expect((limit as { data: { reason: string } }).data.reason).toBe('steps');
    expect(dispatch).toHaveBeenCalledTimes(2);
    expect(session.status).toBe('limit-reached');
  });

  it('ChatAgentService_MaxApplicationsReached_StopsAndSummarizes', async () => {
    const dispatch = jest.fn(async () => ({
      jobApplicationId: 'a1',
      alreadyExisting: false,
      postingCompany: 'Acme',
      postingTitle: 'Engineer',
    }));
    const provider = new FakeAgentLlmProvider([
      [
        {
          kind: 'tool-use',
          id: 'c1',
          name: 'create_application',
          input: { jobPostingId: 'p1', talentId: 't1' },
        },
        { kind: 'done', stopReason: 'tool_use', usage: { inputTokens: 1, outputTokens: 1 } },
      ],
    ]);
    const { service } = makeService({ provider, dispatch, budgets: { maxApplications: 1 } });
    const { session, events } = await runToCompletion(service, 'team', 'u1', 'Hallo');
    const limit = events.find((e) => e.name === 'limit');
    expect((limit as { data: { reason: string } }).data.reason).toBe('applications');
    const drafts = events.find((e) => e.name === 'drafts');
    expect((drafts as { data: unknown[] }).data).toHaveLength(1);
    expect(session.status).toBe('limit-reached');
  });

  it('ChatAgentService_TokenBudgetReached_Stops', async () => {
    const dispatch = jest.fn(async () => ({}));
    const provider = new FakeAgentLlmProvider([
      [
        { kind: 'tool-use', id: 'c1', name: 'list_mandanten', input: {} },
        { kind: 'done', stopReason: 'tool_use', usage: { inputTokens: 500, outputTokens: 500 } },
      ],
    ]);
    const { service } = makeService({ provider, dispatch, budgets: { maxTokens: 100 } });
    const { session, events } = await runToCompletion(service, 'team', 'u1', 'Hallo');
    const limit = events.find((e) => e.name === 'limit');
    expect((limit as { data: { reason: string } }).data.reason).toBe('tokens');
    expect(session.status).toBe('limit-reached');
  });

  it('ChatAgentService_Abort_EndsRunAsAborted', async () => {
    const provider: AgentLlmProvider = {
      id: 'claude',
      async *streamAgentTurn(input) {
        yield { kind: 'text-delta', text: 'thinking…' };
        await new Promise<void>((resolve) => {
          if (input.signal?.aborted) resolve();
          else input.signal?.addEventListener('abort', () => resolve(), { once: true });
        });
      },
    };
    const { service } = makeService({ provider });
    const session = await service.prepare('team', 'u1', { message: 'Hallo' });
    const events: ChatAgentEvent[] = [];
    const running = service.run('team', 'u1', session, (ev) => {
      events.push(ev);
    });
    await new Promise((r) => setTimeout(r, 10));
    service.abort('team', 'u1', session.id);
    await running;
    expect(names(events)).toContain('aborted');
    expect(session.status).toBe('aborted');
  });

  it('ChatAgentService_Abort_PersistsHonestPartialTranscript', async () => {
    const provider: AgentLlmProvider = {
      id: 'claude',
      async *streamAgentTurn(input) {
        yield { kind: 'text-delta', text: 'partieller Text' };
        await new Promise<void>((resolve) => {
          if (input.signal?.aborted) resolve();
          else input.signal?.addEventListener('abort', () => resolve(), { once: true });
        });
      },
    };
    const { service, repo } = makeService({ provider });
    const session = await service.prepare('team', 'u1', { message: 'Hallo' });
    await service.run('team', 'u1', session, (ev) => {
      if (ev.name === 'text') service.abort('team', 'u1', session.id);
    });
    const persisted = await repo.findById('team', 'u1', session.id);
    expect(persisted?.status).toBe('aborted');
    expect(persisted?.messages.some((m) => m.text === 'partieller Text')).toBe(true);
  });

  it('ChatAgentService_PersistsEachStepIncrementally', async () => {
    const dispatch = jest.fn(async () => ({}));
    const provider = new FakeAgentLlmProvider([
      [
        { kind: 'tool-use', id: 'c1', name: 'list_mandanten', input: {} },
        { kind: 'done', stopReason: 'tool_use', usage: { inputTokens: 1, outputTokens: 1 } },
      ],
      [
        { kind: 'text-delta', text: 'ok' },
        { kind: 'done', stopReason: 'end_turn', usage: { inputTokens: 1, outputTokens: 1 } },
      ],
    ]);
    const { service, repo } = makeService({ provider, dispatch });
    const session = await service.prepare('team', 'u1', { message: 'Hallo' });
    const persistedToolResult: Array<string[]> = [];
    const original = repo.update.bind(repo);
    repo.update = async (o, u, s) => {
      await original(o, u, s);
      persistedToolResult.push(
        s.messages.filter((m) => m.toolResult).map((m) => m.toolResult!.name),
      );
    };
    await service.run('team', 'u1', session, () => {});
    expect(persistedToolResult.some((r) => r.includes('list_mandanten'))).toBe(true);
  });

  it('ChatAgentService_StaleRunningSession_TreatedAsAborted', async () => {
    const provider = new FakeAgentLlmProvider([
      [
        { kind: 'text-delta', text: 'ok' },
        { kind: 'done', stopReason: 'end_turn', usage: { inputTokens: 1, outputTokens: 1 } },
      ],
    ]);
    const repo = new InMemoryChatSessionRepository();
    await repo.add({
      id: 's1',
      ownerId: 'team',
      userId: 'u1',
      messages: [{ role: 'user', text: 'old', createdAt: 'x' }],
      status: 'running',
      usage: { inputTokens: 0, outputTokens: 0, costUsd: 0 },
      createdAt: 'x',
      updatedAt: 'x',
    });
    const { service } = makeService({ provider, repo });
    const { session } = await runToCompletion(service, 'team', 'u1', 'weiter', 's1');
    // The stale running session was marked aborted, then continued normally.
    expect(session.status).toBe('done');
    expect(session.messages.some((m) => m.text === 'Lauf durch Neustart abgebrochen.')).toBe(true);
  });

  it('ChatAgentService_EachToolCall_RunsInScope', async () => {
    const dispatch = jest.fn(async () => ({}));
    const provider = new FakeAgentLlmProvider([
      [
        { kind: 'tool-use', id: 'c1', name: 'list_mandanten', input: {} },
        { kind: 'done', stopReason: 'tool_use', usage: { inputTokens: 1, outputTokens: 1 } },
      ],
      [
        { kind: 'text-delta', text: 'ok' },
        { kind: 'done', stopReason: 'end_turn', usage: { inputTokens: 1, outputTokens: 1 } },
      ],
    ]);
    const { service } = makeService({ provider, dispatch });
    await runToCompletion(service, 'workspace-A', 'u1', 'Hallo');
    expect(dispatch.mock.calls[0][0]).toBe('workspace-A');
  });

  it('ChatAgentService_MetersEachTurn', async () => {
    const dispatch = jest.fn(async () => ({}));
    const provider = new FakeAgentLlmProvider([
      [
        { kind: 'tool-use', id: 'c1', name: 'list_mandanten', input: {} },
        { kind: 'done', stopReason: 'tool_use', usage: { inputTokens: 10, outputTokens: 20 } },
      ],
      [
        { kind: 'text-delta', text: 'ok' },
        { kind: 'done', stopReason: 'end_turn', usage: { inputTokens: 3, outputTokens: 4 } },
      ],
    ]);
    const meter = new InMemoryUsageMeter();
    const { service } = makeService({ provider, dispatch, meter });
    await runToCompletion(service, 'team', 'u1', 'Hallo');
    expect(meter.events).toHaveLength(2); // one agentChat row per provider round
    expect(meter.events.every((e) => e.feature === 'agentChat')).toBe(true);
  });

  it('ChatAgentService_Prepare_UnknownSessionId_ThrowsNotFound', async () => {
    const { service } = makeService();
    await expect(
      service.prepare('team', 'u1', { sessionId: 'ghost', message: 'hi' }),
    ).rejects.toThrow('Chat session ghost not found');
  });

  it('ChatAgentService_Prepare_NewSession_SetsTitle', async () => {
    const { service } = makeService();
    const session = await service.prepare('team', 'u1', { message: 'Erstelle Bewerbungen' });
    expect(session.title).toBe('Erstelle Bewerbungen');
    expect(session.userId).toBe('u1');
  });

  it('ChatAgentService_ListGetDelete_RoundTrip', async () => {
    const { service } = makeService();
    const session = await service.prepare('team', 'u1', { message: 'Hallo' });
    const list = await service.list('team', 'u1');
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({ id: session.id, messageCount: 1 });
    expect((await service.get('team', 'u1', session.id)).id).toBe(session.id);
    await service.delete('team', 'u1', session.id);
    await expect(service.get('team', 'u1', session.id)).rejects.toThrow('not found');
  });

  it('ChatAgentService_Abort_NoActiveRun_ReturnsFalse', async () => {
    const { service } = makeService();
    expect(service.abort('team', 'u1', 'ghost')).toBe(false);
  });

  it('ChatAgentService_SweepRunning_MarksAborted', async () => {
    const repo = new InMemoryChatSessionRepository();
    await repo.add({
      id: 's1',
      ownerId: 'team',
      userId: 'u1',
      messages: [],
      status: 'running',
      usage: { inputTokens: 0, outputTokens: 0, costUsd: 0 },
      createdAt: 'x',
      updatedAt: 'x',
    });
    const { service } = makeService({ repo });
    expect(await service.sweepRunning()).toBe(1);
    const swept = await repo.findById('team', 'u1', 's1');
    expect(swept?.status).toBe('aborted');
  });

  it('ChatAgentService_MeterFailure_DoesNotBreakRun', async () => {
    const provider = new FakeAgentLlmProvider([
      [
        { kind: 'text-delta', text: 'ok' },
        { kind: 'done', stopReason: 'end_turn', usage: { inputTokens: 1, outputTokens: 1 } },
      ],
    ]);
    const failingMeter = {
      record: jest.fn(async () => {
        throw new Error('meter down');
      }),
      list: jest.fn(async () => []),
      removeForUser: jest.fn(async () => {}),
    };
    const { service } = makeService({
      provider,
      meter: failingMeter as unknown as InMemoryUsageMeter,
    });
    const { session, events } = await runToCompletion(service, 'team', 'u1', 'Hallo');
    expect(session.status).toBe('done');
    expect(names(events).slice(-2)).toEqual(['usage', 'done']);
  });

  it('ChatAgentService_EndTurnWithNoText_StillCompletes', async () => {
    const provider = new FakeAgentLlmProvider([
      [{ kind: 'done', stopReason: 'end_turn', usage: { inputTokens: 0, outputTokens: 0 } }],
    ]);
    const { service } = makeService({ provider });
    const { session, events } = await runToCompletion(service, 'team', 'u1', 'Hallo');
    expect(session.status).toBe('done');
    expect(names(events)).toEqual(['drafts', 'usage', 'done']);
  });
});
