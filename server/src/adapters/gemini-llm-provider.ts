import { UpstreamProviderError } from '../domain/errors.js';
import type {
  LlmGenerateInput,
  LlmGenerateResult,
  LlmProvider,
  LlmProviderId,
} from '../ports/llm-provider.js';
import type { HttpFetch } from '../ports/http-fetch.js';

const BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

export interface GeminiConfig {
  apiKey: string;
  model: string;
}

interface GeminiResponse {
  candidates?: { content?: { parts?: { text?: string }[] } }[];
  usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number };
}

/**
 * Gemini via Google's Generative Language API (`:generateContent`). Same shape
 * as {@link AnthropicLlmProvider} so the two are interchangeable behind the LLM
 * service; raw HTTP over the {@link HttpFetch} port keeps it unit-testable.
 */
export class GeminiLlmProvider implements LlmProvider {
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
    const url = `${BASE}/${encodeURIComponent(this.model)}:generateContent?key=${encodeURIComponent(input.apiKey ?? this.apiKey)}`;
    const res = await this.http(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        ...(input.system ? { systemInstruction: { parts: [{ text: input.system }] } } : {}),
        contents: [{ role: 'user', parts: [{ text: input.prompt }] }],
        generationConfig: {
          maxOutputTokens: input.maxTokens ?? 1024,
          // Gemini 2.5 spends "thinking" tokens inside maxOutputTokens; with
          // our tight budgets that truncates the visible reply (and breaks
          // JSON parsing). These are short, structured tasks — disable it.
          thinkingConfig: { thinkingBudget: 0 },
        },
      }),
    });
    if (res.status === 400 || res.status === 401 || res.status === 403) {
      throw new UpstreamProviderError(
        'Google rejected the API key — check it under Settings → AI models & API keys.',
      );
    }
    if (!res.ok) {
      throw new UpstreamProviderError(
        `The Gemini API responded with ${res.status} — try again in a moment.`,
      );
    }
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
}
