import type {
  LlmGenerateInput,
  LlmGenerateResult,
  LlmProvider,
  LlmProviderId,
} from '../ports/llm-provider';
import type { HttpFetch } from '../ports/http-fetch';

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

/**
 * Claude via the Anthropic Messages API. Talks raw HTTP over the shared
 * {@link HttpFetch} port (the codebase carries no Anthropic SDK and every
 * outbound adapter goes through this port), so it is testable against recorded
 * JSON. `available` is false without an API key, so the LLM service never
 * routes to a provider that can only 401.
 */
export class AnthropicLlmProvider implements LlmProvider {
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
        'x-api-key': input.apiKey ?? this.apiKey,
        'anthropic-version': API_VERSION,
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: input.maxTokens ?? 1024,
        ...(input.system ? { system: input.system } : {}),
        messages: [{ role: 'user', content: input.prompt }],
      }),
    });
    if (!res.ok) throw new Error(`Anthropic responded ${res.status}`);
    const body = (await res.json()) as AnthropicResponse;
    const text = (body.content ?? [])
      .filter((b) => b.type === 'text')
      .map((b) => b.text ?? '')
      .join('')
      .trim();
    if (!text) throw new Error('Anthropic returned no text');
    return {
      text,
      usage: {
        inputTokens: body.usage?.input_tokens ?? 0,
        outputTokens: body.usage?.output_tokens ?? 0,
      },
    };
  }
}
