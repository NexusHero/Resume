import { UpstreamProviderError } from '../domain/errors.js';
import type {
  LlmGenerateInput,
  LlmGenerateResult,
  LlmProvider,
  LlmProviderId,
} from '../ports/llm-provider.js';
import type {
  AgentLlmProvider,
  AgentMessagePart,
  AgentTool,
  AgentTurnEvent,
  AgentTurnInput,
} from '../ports/agent-llm-provider.js';
import type { HttpFetch } from '../ports/http-fetch.js';

const ENDPOINT = 'https://api.anthropic.com/v1/messages';
const API_VERSION = '2023-06-01';

export interface AnthropicConfig {
  apiKey: string;
  model: string;
}

interface AnthropicResponse {
  content?: { type: string; text?: string }[];
  stop_reason?: string;
  usage?: { input_tokens?: number; output_tokens?: number };
}

/** Map a normalised agent history part to an Anthropic `messages` entry. */
function anthropicMessage(part: AgentMessagePart): Record<string, unknown> {
  if (part.role === 'user') {
    const content: unknown[] = [];
    if (part.text !== undefined) content.push({ type: 'text', text: part.text });
    for (const tr of part.toolResults ?? []) {
      content.push({
        type: 'tool_result',
        tool_use_id: tr.toolCallId,
        content: tr.content,
        ...(tr.isError ? { is_error: true } : {}),
      });
    }
    return { role: 'user', content };
  }
  const content: unknown[] = [];
  if (part.text !== undefined) content.push({ type: 'text', text: part.text });
  for (const tc of part.toolCalls ?? []) {
    content.push({ type: 'tool_use', id: tc.id, name: tc.name, input: tc.input });
  }
  return { role: 'assistant', content };
}

/** Map the agent tool registry to Anthropic's `tools` shape. */
function anthropicTools(tools: AgentTool[]): Array<Record<string, unknown>> {
  return tools.map((t) => ({
    name: t.name,
    description: t.description,
    input_schema: t.inputSchema,
  }));
}

type StopReason = 'end_turn' | 'tool_use' | 'max_tokens';

/** Normalise Anthropic's `stop_reason` into the port's `stopReason`. */
function normalizeStopReason(reason: string | undefined): StopReason {
  if (reason === 'tool_use' || reason === 'max_tokens') return reason;
  return 'end_turn';
}

/**
 * Claude via the Anthropic Messages API. Talks raw HTTP over the shared
 * {@link HttpFetch} port (no Anthropic SDK), so it is testable against recorded
 * JSON/SSE. Implements both the single-shot {@link LlmProvider} and the agentic
 * streaming {@link AgentLlmProvider} (ADR-0062): `streamAgentTurn` POSTs
 * `stream: true` and maps the SSE `content_block_delta`/`message_delta` events
 * onto the normalised `text-delta`/`tool-use`/`done` events, token by token.
 */
export class AnthropicLlmProvider implements LlmProvider, AgentLlmProvider {
  readonly id: LlmProviderId = 'claude';
  readonly label = 'Claude (Anthropic)';
  private readonly http: HttpFetch;
  private readonly apiKey: string;
  private readonly model: string;

  constructor(deps: { httpFetch: HttpFetch; config: AnthropicConfig }) {
    this.http = deps.httpFetch;
    this.apiKey = deps.config.apiKey;
    this.model = deps.config.model;
  }

  get available(): boolean {
    return Boolean(this.apiKey);
  }

  async generate(input: LlmGenerateInput): Promise<LlmGenerateResult> {
    const res = await this.http(ENDPOINT, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': API_VERSION,
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: input.maxTokens ?? 1024,
        ...(input.system ? { system: input.system } : {}),
        messages: [{ role: 'user', content: input.prompt }],
      }),
    });
    this.throwOnHttpError(res.status, res.ok);
    const body = (await res.json()) as AnthropicResponse;
    const text = (body.content ?? [])
      .filter((b) => b.type === 'text')
      .map((b) => b.text ?? '')
      .join('')
      .trim();
    if (!text) throw new UpstreamProviderError('Anthropic returned an empty response — try again.');
    return {
      text,
      usage: {
        inputTokens: body.usage?.input_tokens ?? 0,
        outputTokens: body.usage?.output_tokens ?? 0,
      },
    };
  }

  async *streamAgentTurn(input: AgentTurnInput): AsyncIterable<AgentTurnEvent> {
    const res = await this.http(ENDPOINT, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': API_VERSION,
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: input.maxTokens ?? 1024,
        stream: true,
        ...(input.system ? { system: input.system } : {}),
        messages: input.messages.map(anthropicMessage),
        tools: anthropicTools(input.tools),
      }),
      signal: input.signal,
    });
    this.throwOnHttpError(res.status, res.ok);
    if (!res.body) {
      throw new UpstreamProviderError('Anthropic returned no stream body — try again.');
    }

    let inputTokens = 0;
    let outputTokens = 0;
    let stopReason: StopReason = 'end_turn';
    // One `tool_use` block is accumulated across several `input_json_delta`s.
    let pendingTool: { id: string; name: string; json: string } | null = null;

    for await (const sse of readSse(res.body)) {
      if (sse.event === 'error') {
        throw new UpstreamProviderError('The Anthropic stream reported an error — try again.');
      }
      if (
        sse.event !== 'message_start' &&
        sse.event !== 'content_block_start' &&
        sse.event !== 'content_block_delta' &&
        sse.event !== 'content_block_stop' &&
        sse.event !== 'message_delta'
      ) {
        continue;
      }
      const data = JSON.parse(sse.data) as {
        type?: string;
        index?: number;
        message?: { usage?: { input_tokens?: number } };
        content_block?: { type?: string; id?: string; name?: string };
        delta?: { type?: string; text?: string; partial_json?: string; stop_reason?: string };
        usage?: { output_tokens?: number };
      };

      if (data.type === 'message_start') {
        inputTokens = data.message?.usage?.input_tokens ?? 0;
      } else if (data.type === 'content_block_start') {
        if (data.content_block?.type === 'tool_use') {
          pendingTool = {
            id: data.content_block.id ?? '',
            name: data.content_block.name ?? '',
            json: '',
          };
        }
      } else if (data.type === 'content_block_delta') {
        if (data.delta?.type === 'text_delta' && data.delta.text !== undefined) {
          yield { kind: 'text-delta', text: data.delta.text };
        } else if (data.delta?.type === 'input_json_delta' && pendingTool) {
          pendingTool.json += data.delta.partial_json ?? '';
        }
      } else if (data.type === 'content_block_stop') {
        if (pendingTool) {
          yield {
            kind: 'tool-use',
            id: pendingTool.id,
            name: pendingTool.name,
            input: parseToolInput(pendingTool.json),
          };
          pendingTool = null;
        }
      } else if (data.type === 'message_delta') {
        outputTokens = data.usage?.output_tokens ?? 0;
        stopReason = normalizeStopReason(data.delta?.stop_reason);
      }
    }

    yield { kind: 'done', stopReason, usage: { inputTokens, outputTokens } };
  }

  private throwOnHttpError(status: number, ok: boolean): void {
    if (status === 401 || status === 403) {
      throw new UpstreamProviderError(
        'Anthropic rejected the API key — check it under Settings → AI models & API keys.',
      );
    }
    if (!ok) {
      throw new UpstreamProviderError(
        `The Anthropic API responded with ${status} — try again in a moment.`,
      );
    }
  }
}

/** Parse an accumulated `input_json_delta` payload; `{}` when it was malformed. */
function parseToolInput(json: string): unknown {
  if (json.trim() === '') return {};
  try {
    return JSON.parse(json);
  } catch {
    return {};
  }
}

interface SseEvent {
  event: string;
  data: string;
}

/**
 * Read an SSE (`text/event-stream`) body into `event:` + `data:` pairs. Each
 * event is `event: <name>\n` then `data: <payload>\n`, terminated by a blank
 * line. Chunk boundaries may split a line, so the reader buffers partial lines.
 * Throws when the stream is aborted mid-read (user cancel / maxTime).
 */
async function* readSse(body: ReadableStream<Uint8Array>): AsyncIterable<SseEvent> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let event = 'message';
  let data = '';
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let nl: number;
      while ((nl = buffer.indexOf('\n')) !== -1) {
        const line = buffer.slice(0, nl).replace(/\r$/, '');
        buffer = buffer.slice(nl + 1);
        if (line.startsWith('event:')) {
          event = line.slice('event:'.length).trim();
        } else if (line.startsWith('data:')) {
          data += line.slice('data:'.length).trimStart();
        } else if (line === '') {
          if (data !== '') yield { event, data };
          event = 'message';
          data = '';
        }
      }
    }
    // Flush a trailing event that ended without a final blank line.
    if (data !== '') yield { event, data };
  } finally {
    reader.releaseLock();
  }
}
