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

const BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

export interface GeminiConfig {
  apiKey: string;
  model: string;
}

interface GeminiResponse {
  candidates?: {
    content?: {
      parts?: Array<{ text?: string; functionCall?: { name: string; args: unknown } }>;
    };
    finishReason?: string;
  }[];
  usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number };
}

/** Gemini's `functionResponse.response` wants an object; our tool result is a
    serialised JSON string, so parse it back (fall back to a string payload). */
function responseValue(content: string): unknown {
  try {
    return JSON.parse(content);
  } catch {
    return { result: content };
  }
}

/** Map a normalised agent history part to a Gemini `contents` entry. */
function geminiContent(part: AgentMessagePart): Record<string, unknown> {
  if (part.role === 'user') {
    const parts: unknown[] = [];
    if (part.text !== undefined) parts.push({ text: part.text });
    for (const tr of part.toolResults ?? []) {
      parts.push({ functionResponse: { name: tr.name, response: responseValue(tr.content) } });
    }
    return { role: 'user', parts };
  }
  const parts: unknown[] = [];
  if (part.text !== undefined) parts.push({ text: part.text });
  for (const tc of part.toolCalls ?? []) {
    parts.push({ functionCall: { name: tc.name, args: tc.input } });
  }
  return { role: 'model', parts };
}

/** Map the agent tool registry to Gemini's `functionDeclarations`. */
function geminiTools(tools: AgentTool[]): Record<string, unknown> | undefined {
  if (tools.length === 0) return undefined;
  return {
    tools: [
      {
        functionDeclarations: tools.map((t) => ({
          name: t.name,
          description: t.description,
          parameters: t.inputSchema,
        })),
      },
    ],
  };
}

let geminiToolSeq = 0;

/**
 * Gemini via Google's Generative Language API (`:generateContent`). Same shape
 * as {@link AnthropicLlmProvider} for the single-shot `generate`; the agentic
 * `streamAgentTurn` is a **non-streaming round** (Owner Q1): one
 * `generateContent` call whose reply is emitted as exactly one `text-delta` (or
 * one `tool-use`) then `done`. No SSE, no `streamGenerateContent` — the
 * `AsyncIterable` contract is identical, only the delta count is one.
 */
export class GeminiLlmProvider implements LlmProvider, AgentLlmProvider {
  readonly id: LlmProviderId = 'gemini';
  readonly label = 'Gemini (Google)';
  private readonly http: HttpFetch;
  private readonly apiKey: string;
  private readonly model: string;

  constructor(deps: { httpFetch: HttpFetch; config: GeminiConfig }) {
    this.http = deps.httpFetch;
    this.apiKey = deps.config.apiKey;
    this.model = deps.config.model;
  }

  get available(): boolean {
    return Boolean(this.apiKey);
  }

  async generate(input: LlmGenerateInput): Promise<LlmGenerateResult> {
    const url = this.url();
    const res = await this.http(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        ...(input.system ? { systemInstruction: { parts: [{ text: input.system }] } } : {}),
        contents: [{ role: 'user', parts: [{ text: input.prompt }] }],
        generationConfig: this.generationConfig(input.maxTokens),
      }),
    });
    this.throwOnHttpError(res.status, res.ok);
    const body = (await res.json()) as GeminiResponse;
    const text = (body.candidates?.[0]?.content?.parts ?? [])
      .map((p) => p.text ?? '')
      .join('')
      .trim();
    if (!text) throw new UpstreamProviderError('Gemini returned an empty response — try again.');
    return {
      text,
      usage: {
        inputTokens: body.usageMetadata?.promptTokenCount ?? 0,
        outputTokens: body.usageMetadata?.candidatesTokenCount ?? 0,
      },
    };
  }

  async *streamAgentTurn(input: AgentTurnInput): AsyncIterable<AgentTurnEvent> {
    const res = await this.http(this.url(), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        ...(input.system ? { systemInstruction: { parts: [{ text: input.system }] } } : {}),
        contents: input.messages.map(geminiContent),
        ...geminiTools(input.tools),
        generationConfig: this.generationConfig(input.maxTokens),
      }),
      signal: input.signal,
    });
    this.throwOnHttpError(res.status, res.ok);
    const body = (await res.json()) as GeminiResponse;

    const candidate = body.candidates?.[0];
    const parts = candidate?.content?.parts ?? [];
    const functionCall = parts.find((p) => p.functionCall)?.functionCall;
    const text = parts
      .map((p) => p.text ?? '')
      .join('')
      .trim();

    if (functionCall) {
      yield {
        kind: 'tool-use',
        id: `toolu_gemini_${++geminiToolSeq}`,
        name: functionCall.name,
        input: functionCall.args,
      };
    } else if (text !== '') {
      yield { kind: 'text-delta', text };
    }

    yield {
      kind: 'done',
      stopReason: normalizeFinishReason(candidate?.finishReason),
      usage: {
        inputTokens: body.usageMetadata?.promptTokenCount ?? 0,
        outputTokens: body.usageMetadata?.candidatesTokenCount ?? 0,
      },
    };
  }

  private url(): string {
    return `${BASE}/${encodeURIComponent(this.model)}:generateContent?key=${encodeURIComponent(this.apiKey)}`;
  }

  private generationConfig(maxTokens: number | undefined): Record<string, unknown> {
    return {
      maxOutputTokens: maxTokens ?? 1024,
      // Gemini 2.5 spends "thinking" tokens inside maxOutputTokens; with our
      // tight budgets that truncates the visible reply (and breaks JSON parsing).
      // These are short, structured tasks — disable it.
      thinkingConfig: { thinkingBudget: 0 },
    };
  }

  private throwOnHttpError(status: number, ok: boolean): void {
    if (status === 400 || status === 401 || status === 403) {
      throw new UpstreamProviderError(
        'Google rejected the API key — check it under Settings → AI models & API keys.',
      );
    }
    if (!ok) {
      throw new UpstreamProviderError(
        `The Gemini API responded with ${status} — try again in a moment.`,
      );
    }
  }
}

type StopReason = 'end_turn' | 'tool_use' | 'max_tokens';

function normalizeFinishReason(reason: string | undefined): StopReason {
  if (reason === 'FUNCTION_CALL') return 'tool_use';
  if (reason === 'MAX_TOKENS') return 'max_tokens';
  return 'end_turn';
}
