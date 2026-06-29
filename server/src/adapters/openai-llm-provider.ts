import type { LlmGenerateInput, LlmProvider, LlmProviderId } from '../ports/llm-provider';
import type { HttpFetch } from '../ports/http-fetch';

const ENDPOINT = 'https://api.openai.com/v1/chat/completions';

export interface OpenAiConfig {
  apiKey: string;
  model: string;
}

interface OpenAiResponse {
  choices?: { message?: { content?: string } }[];
}

/**
 * OpenAI via the Chat Completions API. Same shape as the Claude and Gemini
 * providers so all three are interchangeable behind the LLM service; raw HTTP
 * over the {@link HttpFetch} port keeps it unit-testable.
 */
export class OpenAiLlmProvider implements LlmProvider {
  readonly id: LlmProviderId = 'openai';
  readonly label = 'OpenAI (GPT)';
  private readonly http: HttpFetch;
  private apiKey: string;
  private readonly model: string;

  constructor(deps: { httpFetch: HttpFetch; config: OpenAiConfig }) {
    this.http = deps.httpFetch;
    this.apiKey = deps.config.apiKey;
    this.model = deps.config.model;
  }

  get available(): boolean {
    return Boolean(this.apiKey);
  }

  setApiKey(key: string): void {
    this.apiKey = key.trim();
  }

  async generate(input: LlmGenerateInput): Promise<string> {
    const messages = [
      ...(input.system ? [{ role: 'system', content: input.system }] : []),
      { role: 'user', content: input.prompt },
    ];
    const res = await this.http(ENDPOINT, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({ model: this.model, max_tokens: input.maxTokens ?? 1024, messages }),
    });
    if (!res.ok) throw new Error(`OpenAI responded ${res.status}`);
    const body = (await res.json()) as OpenAiResponse;
    const text = (body.choices?.[0]?.message?.content ?? '').trim();
    if (!text) throw new Error('OpenAI returned no text');
    return text;
  }
}
