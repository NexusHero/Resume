import { jest } from '@jest/globals';
import { AnthropicLlmProvider } from '../../src/adapters/anthropic-llm-provider.js';
import { GeminiLlmProvider } from '../../src/adapters/gemini-llm-provider.js';
import { FakeAgentLlmProvider } from '../../src/adapters/agent-fake-provider.js';
import type { AgentTurnEvent, AgentTurnInput } from '../../src/ports/agent-llm-provider.js';
import type { HttpFetch } from '../../src/ports/http-fetch.js';
import { sseHttpFetch } from '../support/fakes.js';

async function collect(iter: AsyncIterable<AgentTurnEvent>): Promise<AgentTurnEvent[]> {
  const events: AgentTurnEvent[] = [];
  for await (const ev of iter) events.push(ev);
  return events;
}

const input: AgentTurnInput = {
  system: 'sys',
  messages: [
    { role: 'user', text: 'hi' },
    { role: 'assistant', toolCalls: [{ id: 'c1', name: 'search_jobs', input: { q: 'rust' } }] },
    { role: 'user', toolResults: [{ toolCallId: 'c1', name: 'search_jobs', content: '[]' }] },
  ],
  tools: [{ name: 'search_jobs', description: 'search', inputSchema: { type: 'object' } }],
};

const anthropicConfig = { apiKey: 'sk-test', model: 'claude-opus-4-8' };

describe('AnthropicLlmProvider.streamAgentTurn', () => {
  it('AnthropicAgent_StreamAgentTurn_EmitsTextDeltasAndToolUse', async () => {
    const sse = [
      'event: message_start',
      'data: {"type":"message_start","message":{"usage":{"input_tokens":100}}}',
      '',
      'event: content_block_start',
      'data: {"type":"content_block_start","index":0,"content_block":{"type":"text"}}',
      '',
      'event: content_block_delta',
      'data: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"Hello "}}',
      '',
      'event: content_block_delta',
      'data: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"world"}}',
      '',
      'event: content_block_stop',
      'data: {"type":"content_block_stop","index":0}',
      '',
      'event: message_delta',
      'data: {"type":"message_delta","delta":{"stop_reason":"end_turn"},"usage":{"output_tokens":50}}',
      '',
      'event: message_stop',
      'data: {"type":"message_stop"}',
      '',
    ].join('\n');
    const { http } = sseHttpFetch(sse);
    const provider = new AnthropicLlmProvider({ httpFetch: http, config: anthropicConfig });
    const events = await collect(provider.streamAgentTurn(input));
    expect(events.filter((e) => e.kind === 'text-delta')).toEqual([
      { kind: 'text-delta', text: 'Hello ' },
      { kind: 'text-delta', text: 'world' },
    ]);
    expect(events.at(-1)).toEqual({
      kind: 'done',
      stopReason: 'end_turn',
      usage: { inputTokens: 100, outputTokens: 50 },
    });
  });

  it('AnthropicAgent_StreamAgentTurn_DoneCarriesUsage', async () => {
    const sse = [
      'event: message_start',
      'data: {"type":"message_start","message":{"usage":{"input_tokens":7}}}',
      '',
      'event: message_delta',
      'data: {"type":"message_delta","delta":{"stop_reason":"end_turn"},"usage":{"output_tokens":9}}',
      '',
      'event: message_stop',
      'data: {"type":"message_stop"}',
      '',
    ].join('\n');
    const { http } = sseHttpFetch(sse);
    const provider = new AnthropicLlmProvider({ httpFetch: http, config: anthropicConfig });
    const events = await collect(provider.streamAgentTurn(input));
    const done = events.find((e) => e.kind === 'done');
    expect(done).toMatchObject({
      stopReason: 'end_turn',
      usage: { inputTokens: 7, outputTokens: 9 },
    });
  });

  it('AnthropicAgent_StreamAgentTurn_ToolUseAccumulatesInputJson', async () => {
    const sse = [
      'event: message_start',
      'data: {"type":"message_start","message":{"usage":{"input_tokens":3}}}',
      '',
      'event: content_block_start',
      'data: {"type":"content_block_start","index":1,"content_block":{"type":"tool_use","id":"toolu_1","name":"search_jobs"}}',
      '',
      'event: content_block_delta',
      'data: {"type":"content_block_delta","index":1,"delta":{"type":"input_json_delta","partial_json":"{\\"q\\":\\""}}',
      '',
      'event: content_block_delta',
      'data: {"type":"content_block_delta","index":1,"delta":{"type":"input_json_delta","partial_json":"rust\\"}"}}',
      '',
      'event: content_block_stop',
      'data: {"type":"content_block_stop","index":1}',
      '',
      'event: message_delta',
      'data: {"type":"message_delta","delta":{"stop_reason":"tool_use"},"usage":{"output_tokens":4}}',
      '',
      'event: message_stop',
      'data: {"type":"message_stop"}',
      '',
    ].join('\n');
    const { http } = sseHttpFetch(sse);
    const provider = new AnthropicLlmProvider({ httpFetch: http, config: anthropicConfig });
    const events = await collect(provider.streamAgentTurn(input));
    expect(events).toContainEqual({
      kind: 'tool-use',
      id: 'toolu_1',
      name: 'search_jobs',
      input: { q: 'rust' },
    });
    expect(events.at(-1)).toMatchObject({ kind: 'done', stopReason: 'tool_use' });
  });

  it('AnthropicAgent_StreamAgentTurn_BadKey_ThrowsUpstreamError', async () => {
    const http: HttpFetch = async () => ({
      ok: false,
      status: 401,
      json: async () => ({}),
      body: null,
    });
    const provider = new AnthropicLlmProvider({ httpFetch: http, config: anthropicConfig });
    await expect(collect(provider.streamAgentTurn(input))).rejects.toThrow('API key');
  });

  it('AnthropicAgent_StreamAgentTurn_NoBody_ThrowsUpstreamError', async () => {
    const http: HttpFetch = async () => ({
      ok: true,
      status: 200,
      json: async () => ({}),
      body: null,
    });
    const provider = new AnthropicLlmProvider({ httpFetch: http, config: anthropicConfig });
    await expect(collect(provider.streamAgentTurn(input))).rejects.toThrow('no stream body');
  });

  it('AnthropicAgent_StreamAgentTurn_ErrorEvent_ThrowsUpstreamError', async () => {
    const sse = ['event: error', 'data: {"type":"error","error":{"message":"boom"}}', ''].join(
      '\n',
    );
    const { http } = sseHttpFetch(sse);
    const provider = new AnthropicLlmProvider({ httpFetch: http, config: anthropicConfig });
    await expect(collect(provider.streamAgentTurn(input))).rejects.toThrow(
      'stream reported an error',
    );
  });

  it('AnthropicAgent_StreamAgentTurn_MalformedToolJson_DefaultsEmptyObject', async () => {
    const sse = [
      'event: message_start',
      'data: {"type":"message_start","message":{"usage":{"input_tokens":0}}}',
      '',
      'event: content_block_start',
      'data: {"type":"content_block_start","index":1,"content_block":{"type":"tool_use","id":"t1","name":"save_job"}}',
      '',
      'event: content_block_delta',
      'data: {"type":"content_block_delta","index":1,"delta":{"type":"input_json_delta","partial_json":"not-json"}}',
      '',
      'event: content_block_stop',
      'data: {"type":"content_block_stop","index":1}',
      '',
      'event: message_delta',
      'data: {"type":"message_delta","delta":{"stop_reason":"tool_use"},"usage":{"output_tokens":0}}',
      '',
      'event: message_stop',
      'data: {"type":"message_stop"}',
      '',
    ].join('\n');
    const { http } = sseHttpFetch(sse);
    const provider = new AnthropicLlmProvider({ httpFetch: http, config: anthropicConfig });
    const events = await collect(provider.streamAgentTurn(input));
    expect(events).toContainEqual({ kind: 'tool-use', id: 't1', name: 'save_job', input: {} });
  });

  it('AnthropicAgent_StreamAgentTurn_MapsAssistantTextAndToolResultError', async () => {
    let captured: Record<string, unknown> | undefined;
    const http: HttpFetch = async (_url, init) => {
      captured = JSON.parse((init?.body as string) ?? '{}');
      return { ok: true, status: 200, json: async () => ({}), body: null };
    };
    const provider = new AnthropicLlmProvider({ httpFetch: http, config: anthropicConfig });
    const richInput: AgentTurnInput = {
      messages: [
        { role: 'assistant', text: 'looking', toolCalls: [{ id: 'c1', name: 'x', input: {} }] },
        {
          role: 'user',
          toolResults: [{ toolCallId: 'c1', name: 'x', content: '[]', isError: true }],
        },
      ],
      tools: [],
    };
    // With no tools and no body, the provider throws — but the request mapping ran.
    await collect(provider.streamAgentTurn(richInput)).catch(() => {});
    const messages = captured?.messages as Array<{
      role: string;
      content: Array<Record<string, unknown>>;
    }>;
    expect(messages[0]).toMatchObject({ role: 'assistant' });
    expect(messages[1].role).toBe('user');
    expect(messages[1].content[0]).toMatchObject({ is_error: true });
  });
});

describe('FakeAgentLlmProvider (dev-only)', () => {
  it('FakeAgentLlmProvider_NoTurns_EmitsOnlyDone', async () => {
    const provider = new FakeAgentLlmProvider([]);
    const events = await collect(provider.streamAgentTurn(input));
    expect(events).toEqual([
      { kind: 'done', stopReason: 'end_turn', usage: { inputTokens: 0, outputTokens: 0 } },
    ]);
  });

  it('FakeAgentLlmProvider_TurnWithoutDone_AppendsDone', async () => {
    const provider = new FakeAgentLlmProvider([[{ kind: 'text-delta', text: 'hi' }]]);
    const events = await collect(provider.streamAgentTurn(input));
    expect(events.at(-1)).toMatchObject({ kind: 'done' });
  });

  it('FakeAgentLlmProvider_MultipleTurns_RepeatsLast', async () => {
    const provider = new FakeAgentLlmProvider([
      [
        { kind: 'text-delta', text: 'one' },
        { kind: 'done', stopReason: 'end_turn', usage: { inputTokens: 0, outputTokens: 0 } },
      ],
      [
        { kind: 'text-delta', text: 'two' },
        { kind: 'done', stopReason: 'end_turn', usage: { inputTokens: 0, outputTokens: 0 } },
      ],
    ]);
    const first = await collect(provider.streamAgentTurn(input));
    const second = await collect(provider.streamAgentTurn(input));
    const third = await collect(provider.streamAgentTurn(input));
    expect(first[0]).toMatchObject({ text: 'one' });
    expect(second[0]).toMatchObject({ text: 'two' });
    expect(third[0]).toMatchObject({ text: 'two' }); // last repeats
  });
});

describe('GeminiLlmProvider.streamAgentTurn (Owner Q1: one non-streaming round)', () => {
  function geminiHttp(body: unknown): HttpFetch {
    return (async () => ({
      ok: true,
      status: 200,
      json: async () => body,
      body: null,
    })) as HttpFetch;
  }

  const geminiConfig = { apiKey: 'k', model: 'gemini-2.5-flash' };

  it('GeminiAgent_StreamAgentTurn_EmitsSingleTextDeltaAndDone', async () => {
    const http = geminiHttp({
      candidates: [{ content: { parts: [{ text: 'Antwort' }] }, finishReason: 'STOP' }],
      usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 20 },
    });
    const provider = new GeminiLlmProvider({ httpFetch: http, config: geminiConfig });
    const events = await collect(provider.streamAgentTurn(input));
    expect(events.filter((e) => e.kind === 'text-delta')).toEqual([
      { kind: 'text-delta', text: 'Antwort' },
    ]);
    expect(events.at(-1)).toEqual({
      kind: 'done',
      stopReason: 'end_turn',
      usage: { inputTokens: 10, outputTokens: 20 },
    });
  });

  it('GeminiAgent_StreamAgentTurn_ToolUseEmitsToolUseAndDone', async () => {
    const http = geminiHttp({
      candidates: [
        {
          content: { parts: [{ functionCall: { name: 'search_jobs', args: { q: 'rust' } } }] },
          finishReason: 'FUNCTION_CALL',
        },
      ],
      usageMetadata: { promptTokenCount: 1, candidatesTokenCount: 2 },
    });
    const provider = new GeminiLlmProvider({ httpFetch: http, config: geminiConfig });
    const events = await collect(provider.streamAgentTurn(input));
    expect(events.some((e) => e.kind === 'tool-use')).toBe(true);
    expect(events.at(-1)).toMatchObject({ kind: 'done', stopReason: 'tool_use' });
  });

  it('GeminiAgent_StreamAgentTurn_DoesNotParseSse', async () => {
    // The Gemini agent path calls `json()` once and never touches a stream body.
    const json = jest.fn(async () => ({
      candidates: [{ content: { parts: [{ text: 'x' }] }, finishReason: 'STOP' }],
      usageMetadata: { promptTokenCount: 0, candidatesTokenCount: 0 },
    }));
    const http: HttpFetch = async () => ({ ok: true, status: 200, json, body: null });
    const provider = new GeminiLlmProvider({ httpFetch: http, config: geminiConfig });
    await collect(provider.streamAgentTurn(input));
    expect(json).toHaveBeenCalledTimes(1);
  });

  it('GeminiAgent_StreamAgentTurn_BadKey_ThrowsUpstreamError', async () => {
    const http: HttpFetch = async () => ({
      ok: false,
      status: 401,
      json: async () => ({}),
      body: null,
    });
    const provider = new GeminiLlmProvider({ httpFetch: http, config: geminiConfig });
    await expect(collect(provider.streamAgentTurn(input))).rejects.toThrow('API key');
  });

  it('GeminiAgent_StreamAgentTurn_EmptyReply_EmitsOnlyDone', async () => {
    const http = geminiHttp({
      candidates: [{ content: { parts: [] }, finishReason: 'STOP' }],
      usageMetadata: { promptTokenCount: 1, candidatesTokenCount: 0 },
    });
    const provider = new GeminiLlmProvider({ httpFetch: http, config: geminiConfig });
    const events = await collect(provider.streamAgentTurn(input));
    expect(events).toEqual([
      { kind: 'done', stopReason: 'end_turn', usage: { inputTokens: 1, outputTokens: 0 } },
    ]);
  });
});
