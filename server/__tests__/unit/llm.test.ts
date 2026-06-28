import { AnthropicLlmProvider } from '../../src/adapters/anthropic-llm-provider';
import { GeminiLlmProvider } from '../../src/adapters/gemini-llm-provider';
import { LlmService } from '../../src/services/llm-service';
import { CoverLetterService } from '../../src/services/cover-letter-service';
import { coverLetterTemplate, coverLetterPrompt } from '../../src/domain/cover-letter';
import { ValidationError } from '../../src/domain/errors';
import type { HttpFetch } from '../../src/ports/http-fetch';
import type { LlmProvider } from '../../src/ports/llm-provider';
import { noopLogger } from '../support/fakes';

function fakeHttp(
  body: unknown,
  opts: { ok?: boolean; status?: number } = {},
): { http: HttpFetch; calls: { url: string; init?: unknown }[] } {
  const calls: { url: string; init?: unknown }[] = [];
  const http: HttpFetch = async (url, init) => {
    calls.push({ url, init });
    return { ok: opts.ok ?? true, status: opts.status ?? 200, json: async () => body };
  };
  return { http, calls };
}

const candidate = { name: 'Suhay Sevinc', title: 'M.Sc. Software Engineer' };
const req = {
  company: 'Celonis',
  role: 'Senior C++ Engineer',
  city: 'München',
  skills: ['C++', 'gRPC'],
};

describe('AnthropicLlmProvider', () => {
  it('Generate_PostsMessagesAndExtractsText', async () => {
    const { http, calls } = fakeHttp({
      content: [{ type: 'text', text: 'Sehr geehrtes Team …' }],
      stop_reason: 'end_turn',
    });
    const provider = new AnthropicLlmProvider({
      httpFetch: http,
      config: { apiKey: 'sk-test', model: 'claude-opus-4-8' },
    });
    const text = await provider.generate({ system: 'sys', prompt: 'write it', maxTokens: 700 });

    expect(text).toBe('Sehr geehrtes Team …');
    expect(provider.available).toBe(true);
    const init = calls[0]!.init as {
      method: string;
      headers: Record<string, string>;
      body: string;
    };
    expect(init.method).toBe('POST');
    expect(init.headers['x-api-key']).toBe('sk-test');
    expect(init.headers['anthropic-version']).toBe('2023-06-01');
    const sent = JSON.parse(init.body);
    expect(sent.model).toBe('claude-opus-4-8');
    expect(sent.system).toBe('sys');
    expect(sent.messages).toEqual([{ role: 'user', content: 'write it' }]);
  });

  it('Available_FalseWithoutKey', () => {
    const { http } = fakeHttp({});
    expect(
      new AnthropicLlmProvider({ httpFetch: http, config: { apiKey: '', model: 'm' } }).available,
    ).toBe(false);
  });

  it('Generate_ThrowsOnHttpError', async () => {
    const { http } = fakeHttp({}, { ok: false, status: 401 });
    const provider = new AnthropicLlmProvider({
      httpFetch: http,
      config: { apiKey: 'k', model: 'm' },
    });
    await expect(provider.generate({ prompt: 'x' })).rejects.toThrow('401');
  });
});

describe('GeminiLlmProvider', () => {
  it('Generate_PostsContentsAndExtractsText', async () => {
    const { http, calls } = fakeHttp({
      candidates: [{ content: { parts: [{ text: 'Hallo Welt' }] } }],
    });
    const provider = new GeminiLlmProvider({
      httpFetch: http,
      config: { apiKey: 'g-key', model: 'gemini-2.5-flash' },
    });
    const text = await provider.generate({ system: 'sys', prompt: 'hi' });

    expect(text).toBe('Hallo Welt');
    expect(calls[0]!.url).toContain('gemini-2.5-flash:generateContent');
    expect(calls[0]!.url).toContain('key=g-key');
  });
});

describe('LlmService', () => {
  const claude: LlmProvider = {
    id: 'claude',
    label: 'Claude',
    available: true,
    generate: async () => 'c',
  };
  const gemini: LlmProvider = {
    id: 'gemini',
    label: 'Gemini',
    available: false,
    generate: async () => 'g',
  };

  it('Settings_ReportsCurrentAndAvailability', () => {
    const svc = new LlmService({
      providers: [claude, gemini],
      defaultProvider: 'claude',
      logger: noopLogger,
    });
    const s = svc.settings();
    expect(s.current).toBe('claude');
    expect(s.providers).toEqual([
      { id: 'claude', label: 'Claude', available: true },
      { id: 'gemini', label: 'Gemini', available: false },
    ]);
  });

  it('SetProvider_SwitchesAndRejectsUnknown', () => {
    const svc = new LlmService({
      providers: [claude, gemini],
      defaultProvider: 'claude',
      logger: noopLogger,
    });
    expect(svc.setProvider('gemini').current).toBe('gemini');
    expect(() => svc.setProvider('openai')).toThrow(ValidationError);
  });

  it('Active_NullWhenSelectedProviderHasNoCredentials', () => {
    const svc = new LlmService({
      providers: [claude, gemini],
      defaultProvider: 'claude',
      logger: noopLogger,
    });
    expect(svc.active()).toBe(claude);
    svc.setProvider('gemini'); // unavailable
    expect(svc.active()).toBeNull();
  });
});

describe('CoverLetterService', () => {
  it('Generate_UsesActiveProvider', async () => {
    const provider: LlmProvider = {
      id: 'claude',
      label: 'Claude',
      available: true,
      generate: async () => 'LLM letter',
    };
    const llm = new LlmService({
      providers: [provider],
      defaultProvider: 'claude',
      logger: noopLogger,
    });
    const svc = new CoverLetterService({ llmService: llm, candidate, logger: noopLogger });
    const out = await svc.generate(req);
    expect(out).toEqual({ text: 'LLM letter', provider: 'claude' });
  });

  it('Generate_FallsBackToTemplateWhenNoProvider', async () => {
    const provider: LlmProvider = {
      id: 'claude',
      label: 'Claude',
      available: false,
      generate: async () => 'unused',
    };
    const llm = new LlmService({
      providers: [provider],
      defaultProvider: 'claude',
      logger: noopLogger,
    });
    const svc = new CoverLetterService({ llmService: llm, candidate, logger: noopLogger });
    const out = await svc.generate(req);
    expect(out.provider).toBe('template');
    expect(out.text).toContain('Celonis');
    expect(out.text).toContain('Suhay Sevinc');
  });

  it('Generate_FallsBackToTemplateWhenProviderThrows', async () => {
    const provider: LlmProvider = {
      id: 'gemini',
      label: 'Gemini',
      available: true,
      generate: async () => {
        throw new Error('boom');
      },
    };
    const llm = new LlmService({
      providers: [provider],
      defaultProvider: 'gemini',
      logger: noopLogger,
    });
    const svc = new CoverLetterService({ llmService: llm, candidate, logger: noopLogger });
    const out = await svc.generate(req);
    expect(out.provider).toBe('template');
  });
});

describe('cover-letter domain', () => {
  it('Template_WeavesCompanyRoleAndSkills', () => {
    const text = coverLetterTemplate(req, candidate);
    expect(text).toContain('Celonis');
    expect(text).toContain('Senior C++ Engineer');
    expect(text).toContain('C++ und gRPC');
    expect(text.trim().endsWith('Suhay Sevinc')).toBe(true);
  });

  it('Prompt_IncludesStructuredFacts', () => {
    const { system, prompt } = coverLetterPrompt(req, candidate);
    expect(system).toContain('Deutsch');
    expect(prompt).toContain('Celonis');
    expect(prompt).toContain('C++, gRPC');
  });
});
