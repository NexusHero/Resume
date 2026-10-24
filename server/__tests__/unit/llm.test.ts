import { AiNotConfiguredError, UpstreamProviderError } from '../../src/domain/errors.js';
import { AnthropicLlmProvider } from '../../src/adapters/anthropic-llm-provider.js';
import { GeminiLlmProvider } from '../../src/adapters/gemini-llm-provider.js';
import { LlmService } from '../../src/services/llm-service.js';
import { LlmFeatureRunner } from '../../src/services/llm-feature-runner.js';
import { CoverLetterService } from '../../src/services/cover-letter-service.js';
import { coverLetterPrompt } from '../../src/domain/cover-letter.js';
import type { HttpFetch } from '../../src/ports/http-fetch.js';
import type { LlmGenerateResult, LlmProvider } from '../../src/ports/llm-provider.js';
import {
  noopLogger,
  InMemoryUsageMeter,
  InMemoryUserRepository,
  FixedClock,
} from '../support/fakes.js';

/** A generate() result with the given text and token usage (defaults to zero). */
function result(text: string, inputTokens = 0, outputTokens = 0): LlmGenerateResult {
  return { text, usage: { inputTokens, outputTokens } };
}

function fakeHttp(
  body: unknown,
  opts: { ok?: boolean; status?: number } = {},
): { http: HttpFetch; calls: { url: string; init?: unknown }[] } {
  const calls: { url: string; init?: unknown }[] = [];
  const http: HttpFetch = async (url, init) => {
    calls.push({ url, init });
    return { ok: opts.ok ?? true, status: opts.status ?? 200, json: async () => body, body: null };
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
      usage: { input_tokens: 120, output_tokens: 340 },
    });
    const provider = new AnthropicLlmProvider({
      httpFetch: http,
      config: { apiKey: 'sk-test', model: 'claude-opus-4-8' },
    });
    const result = await provider.generate({ system: 'sys', prompt: 'write it', maxTokens: 700 });

    expect(result.text).toBe('Sehr geehrtes Team …');
    expect(result.usage).toEqual({ inputTokens: 120, outputTokens: 340 });
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

  it('Generate_BadKey_ThrowsActionableUpstreamError', async () => {
    // 401 from Anthropic = rejected key → a 502 problem with a hint, not a 500.
    const { http } = fakeHttp({}, { ok: false, status: 401 });
    const provider = new AnthropicLlmProvider({
      httpFetch: http,
      config: { apiKey: 'k', model: 'm' },
    });
    const err = await provider.generate({ prompt: 'x' }).catch((e) => e);
    expect(err).toBeInstanceOf(UpstreamProviderError);
    expect(err.status).toBe(502);
    expect(err.message).toContain('API key');
  });

  it('Generate_UpstreamOutage_ThrowsUpstreamError', async () => {
    const { http } = fakeHttp({}, { ok: false, status: 529 });
    const provider = new AnthropicLlmProvider({
      httpFetch: http,
      config: { apiKey: 'k', model: 'm' },
    });
    await expect(provider.generate({ prompt: 'x' })).rejects.toThrow('529');
  });
});

describe('GeminiLlmProvider', () => {
  it('Generate_PostsContentsAndExtractsText', async () => {
    const { http, calls } = fakeHttp({
      candidates: [{ content: { parts: [{ text: 'Hallo Welt' }] } }],
      usageMetadata: { promptTokenCount: 12, candidatesTokenCount: 34 },
    });
    const provider = new GeminiLlmProvider({
      httpFetch: http,
      config: { apiKey: 'g-key', model: 'gemini-2.5-flash' },
    });
    const result = await provider.generate({ system: 'sys', prompt: 'hi' });

    expect(result.text).toBe('Hallo Welt');
    expect(result.usage).toEqual({ inputTokens: 12, outputTokens: 34 });
    expect(calls[0]!.url).toContain('gemini-2.5-flash:generateContent');
    expect(calls[0]!.url).toContain('key=g-key');
  });

  it('Generate_DisablesThinkingSoTheBudgetIsAllVisibleOutput', async () => {
    // Gemini 2.5 spends "thinking" tokens inside maxOutputTokens; without
    // thinkingBudget: 0 our tight budgets come back truncated mid-JSON.
    const { http, calls } = fakeHttp({
      candidates: [{ content: { parts: [{ text: 'ok' }] } }],
    });
    const provider = new GeminiLlmProvider({
      httpFetch: http,
      config: { apiKey: 'g-key', model: 'gemini-2.5-flash' },
    });
    await provider.generate({ prompt: 'hi', maxTokens: 900 });

    const sent = JSON.parse((calls[0]!.init as { body: string }).body);
    expect(sent.generationConfig).toEqual({
      maxOutputTokens: 900,
      thinkingConfig: { thinkingBudget: 0 },
    });
  });
});

describe('LlmService', () => {
  const provider = (id: 'claude' | 'gemini', available: boolean): LlmProvider => ({
    id,
    label: id === 'claude' ? 'Claude' : 'Gemini',
    available,
    generate: async () => result(id),
  });

  const service = (providers: LlmProvider[], defaultProvider: 'claude' | 'gemini' = 'claude') =>
    new LlmService({ providers, defaultProvider, logger: noopLogger });

  it('LlmService_NoKeysConfigured_ResolveReturnsNull', () => {
    const svc = service([provider('claude', false), provider('gemini', false)]);
    expect(svc.resolve()).toBeNull();
    expect(svc.hasAvailableProvider()).toBe(false);
  });

  it('LlmService_PreferredProviderAvailable_ResolveReturnsIt', () => {
    const svc = service([provider('claude', true), provider('gemini', true)]);
    expect(svc.resolve('gemini')?.id).toBe('gemini');
  });

  it('LlmService_PreferredProviderUnavailable_ResolveReturnsConfiguredProvider', () => {
    const svc = service([provider('claude', true), provider('gemini', false)]);
    expect(svc.resolve('gemini')?.id).toBe('claude');
  });

  it('LlmService_DefaultUnavailableOtherAvailable_ResolveReturnsOther', () => {
    const svc = service([provider('claude', false), provider('gemini', true)], 'claude');
    expect(svc.resolve()?.id).toBe('gemini');
  });

  it('LlmService_Settings_ReportsConfiguredFlag', () => {
    const svc = service([provider('claude', true), provider('gemini', false)]);
    const settings = svc.settings();
    expect(settings.configured).toBe(true);
    expect(settings.current).toBe('claude');
    expect(settings.providers).toEqual([
      { id: 'claude', label: 'Claude', available: true },
      { id: 'gemini', label: 'Gemini', available: false },
    ]);
  });

  it('LlmService_StoredChoiceUnavailable_SettingsReportsEffectiveProvider', () => {
    const svc = service([provider('claude', false), provider('gemini', true)]);
    expect(svc.settings('claude').current).toBe('gemini');
    expect(svc.settings('gemini').current).toBe('gemini');
  });

  it('LlmService_NoProviderConfigured_SettingsCurrentIsNull', () => {
    const svc = service([provider('claude', false)]);
    expect(svc.settings().configured).toBe(false);
    expect(svc.settings().current).toBeNull();
  });

  it('LlmService_Get_ReturnsProviderRegardlessOfAvailability', () => {
    const gemini = provider('gemini', false);
    const svc = service([provider('claude', false), gemini]);
    expect(svc.get('gemini')).toBe(gemini);
  });

  it('LlmService_UnknownDefault_FallsBackToTheFirstWiredProvider', () => {
    const svc = new LlmService({
      providers: [provider('claude', true), provider('gemini', true)],
      defaultProvider: 'openai' as never,
      logger: noopLogger,
    });
    expect(svc.currentProvider()).toBe('claude');
  });
});

describe('CoverLetterService', () => {
  const user = (llmProvider?: 'claude' | 'gemini') => {
    const users = new InMemoryUserRepository();
    users.users.push({
      id: 'user-1',
      email: 'u@example.com',
      passwordHash: '',
      roles: ['recruiter'],
      createdAt: '2026-01-01T00:00:00.000Z',
      ...(llmProvider ? { llmProvider } : {}),
    });
    return users;
  };

  const provider = (id: 'claude' | 'gemini', available = true): LlmProvider => ({
    id,
    label: id,
    available,
    generate: async () => result('LLM letter', 40, 90),
  });

  const build = (
    providers: LlmProvider[],
    opts: { defaultProvider?: 'claude' | 'gemini'; users?: InMemoryUserRepository } = {},
  ) => {
    const llm = new LlmService({
      providers,
      defaultProvider: opts.defaultProvider ?? 'claude',
      logger: noopLogger,
    });
    const usageMeter = new InMemoryUsageMeter();
    const svc = new CoverLetterService({
      llmService: llm,
      userRepository: opts.users ?? user(),
      candidate,
      usageMeter,
      clock: new FixedClock(),
      logger: noopLogger,
    });
    return { svc, usageMeter };
  };

  it('CoverLetterService_WithProvider_ReturnsTextAndMetersUsage', async () => {
    const { svc, usageMeter } = build([provider('claude')]);
    const out = await svc.generate(req, 'user-1');
    expect(out).toEqual({ text: 'LLM letter', provider: 'claude' });
    const events = await usageMeter.list('user-1');
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ provider: 'claude', feature: 'coverLetter' });
  });

  it('CoverLetterService_NoProvider_ThrowsAiNotConfiguredAndReturnsNoText', async () => {
    const { svc } = build([provider('claude', false)]);
    await expect(svc.generate(req, 'user-1')).rejects.toBeInstanceOf(AiNotConfiguredError);
  });

  it('CoverLetterService_ProviderFails_ThrowsUpstreamProvider', async () => {
    const failing: LlmProvider = {
      id: 'gemini',
      label: 'Gemini',
      available: true,
      generate: async () => {
        throw new Error('boom');
      },
    };
    const { svc } = build([failing], { defaultProvider: 'gemini' });
    await expect(svc.generate(req, 'user-1')).rejects.toBeInstanceOf(UpstreamProviderError);
  });

  it('CoverLetterService_StoredChoiceAvailable_UsesIt', async () => {
    const { svc } = build([provider('claude'), provider('gemini')], {
      users: user('gemini'),
    });
    expect(await svc.generate(req, 'user-1')).toMatchObject({ provider: 'gemini' });
  });
});

describe('LlmFeatureRunner', () => {
  const build = (
    available: boolean,
    generate?: (input: {
      prompt: string;
    }) => Promise<{ text: string; usage: { inputTokens: number; outputTokens: number } }>,
  ) => {
    const provider: LlmProvider = {
      id: 'claude',
      label: 'Claude',
      available,
      generate:
        generate ?? (async () => ({ text: 'ok', usage: { inputTokens: 1, outputTokens: 1 } })),
    };
    const llmService = new LlmService({
      providers: [provider],
      defaultProvider: 'claude',
      logger: noopLogger,
    });
    const users = new InMemoryUserRepository();
    users.users.push({
      id: 'u1',
      email: 'u1@example.com',
      passwordHash: '',
      roles: ['recruiter'],
      createdAt: '2026-01-01T00:00:00.000Z',
    });
    return new LlmFeatureRunner({
      llmService,
      userRepository: users,
      usageMeter: new InMemoryUsageMeter(),
      clock: new FixedClock(),
      logger: noopLogger,
    });
  };

  it('LlmFeatureRunner_ResolveProvider_NoProviderConfigured_ThrowsAiNotConfigured', async () => {
    const runner = build(false);
    await expect(runner.resolveProvider('u1')).rejects.toBeInstanceOf(AiNotConfiguredError);
  });

  it('LlmFeatureRunner_Run_GenerationFails_ThrowsUpstreamProvider', async () => {
    const runner = build(true, async () => {
      throw new Error('boom');
    });
    await expect(
      runner.run('u1', 'suggest', 10, { system: 's', prompt: 'p' }),
    ).rejects.toBeInstanceOf(UpstreamProviderError);
  });

  it('LlmFeatureRunner_RunFeature_NoFallback_ReturnsProviderOnly', async () => {
    const runner = build(true, async () => ({
      text: JSON.stringify({ value: 'x' }),
      usage: { inputTokens: 1, outputTokens: 1 },
    }));
    const { content, provider } = await runner.runFeature(
      'u1',
      'suggest',
      10,
      { system: 's', prompt: 'p' },
      {
        schema: {
          safeParse: (v: unknown) => ({ success: true as const, data: v as { value: string } }),
        },
        normalize: (p) => p,
      },
    );
    expect(content).toEqual({ value: 'x' });
    expect(provider).toBe('claude');
  });

  it('LlmFeatureRunner_ParseReply_InvalidJson_ThrowsUpstreamProvider', () => {
    const runner = build(true);
    expect(() =>
      runner.parseReply('suggest', 'not json', {
        safeParse: () => ({ success: false as const }),
      }),
    ).toThrow(UpstreamProviderError);
  });
});

describe('cover-letter domain', () => {
  it('Prompt_IncludesStructuredFacts', () => {
    const built = coverLetterPrompt(req, candidate, 'en');
    expect(built.system).toContain('cover letter');
    expect(built.prompt).toContain('Celonis');
    expect(built.prompt).toContain('C++');
  });

  it('Prompt_German_AsksForGermanOutput', () => {
    expect(coverLetterPrompt(req, candidate, 'de').system).toContain('Deutsch');
  });

  it('Prompt_NoSkills_UsesDash', () => {
    expect(coverLetterPrompt({ ...req, skills: [] }, candidate, 'en').prompt).toContain('—');
  });
});
