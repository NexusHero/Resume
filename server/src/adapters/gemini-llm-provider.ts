import type { LlmGenerateInput, LlmProvider, LlmProviderId } from '../ports/llm-provider';
import type { HttpFetch } from '../ports/http-fetch';

const BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

export interface GeminiConfig {
  apiKey: string;
  model: string;
}

interface GeminiResponse {
  candidates?: { content?: { parts?: { text?: string }[] } }[];
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

  async generate(input: LlmGenerateInput): Promise<string> {
    const url = `${BASE}/${encodeURIComponent(this.model)}:generateContent?key=${encodeURIComponent(this.apiKey)}`;
    const res = await this.http(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        ...(input.system ? { systemInstruction: { parts: [{ text: input.system }] } } : {}),
        contents: [{ role: 'user', parts: [{ text: input.prompt }] }],
        generationConfig: { maxOutputTokens: input.maxTokens ?? 1024 },
      }),
    });
    if (!res.ok) throw new Error(`Gemini responded ${res.status}`);
    const body = (await res.json()) as GeminiResponse;
    const text = (body.candidates?.[0]?.content?.parts ?? [])
      .map((p) => p.text ?? '')
      .join('')
      .trim();
    if (!text) throw new Error('Gemini returned no text');
    return text;
  }
}
