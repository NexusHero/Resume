import { UpstreamProviderError } from '../../src/domain/errors';
import { AnthropicLlmProvider } from '../../src/adapters/anthropic-llm-provider';
import { GeminiLlmProvider } from '../../src/adapters/gemini-llm-provider';
import { LlmService } from '../../src/services/llm-service';
import { CoverLetterService } from '../../src/services/cover-letter-service';
import { coverLetterTemplate, coverLetterPrompt } from '../../src/domain/cover-letter';
import { ValidationError } from '../../src/domain/errors';
import type { HttpFetch } from '../../src/ports/http-fetch';
import type { LlmGenerateResult, LlmProvider } from '../../src/ports/llm-provider';
import { noopLogger, InMemoryUsageMeter, FixedClock } from '../support/fakes';

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
});

describe('LlmService', () => {
  const claude: LlmProvider = {
    id: 'claude',
    label: 'Claude',
    available: true,
    generate: async () => result('c'),
  };
  const gemini: LlmProvider = {
    id: 'gemini',
    label: 'Gemini',
    available: false,
    generate: async () => result('g'),
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

  it('Get_ReturnsProviderRegardlessOfAvailability_CurrentReflectsSelection', () => {
    const svc = new LlmService({
      providers: [claude, gemini],
      defaultProvider: 'claude',
      logger: noopLogger,
    });
    expect(svc.currentProvider()).toBe('claude');
    expect(svc.get('gemini')).toBe(gemini); // unavailable but still returned for user-key callers
    svc.setProvider('gemini');
    expect(svc.currentProvider()).toBe('gemini');
  });
});

describe('CoverLetterService', () => {
  const build = (llm: LlmService, usageMeter = new InMemoryUsageMeter()) => ({
    svc: new CoverLetterService({
      llmService: llm,
      candidate,
      usageMeter,
      clock: new FixedClock(),
      logger: noopLogger,
    }),
    usageMeter,
  });

  it('Generate_UsesActiveProvider', async () => {
    const provider: LlmProvider = {
      id: 'claude',
      label: 'Claude',
      available: true,
      generate: async () => result('LLM letter'),
    };
    const llm = new LlmService({
      providers: [provider],
      defaultProvider: 'claude',
      logger: noopLogger,
    });
    const { svc } = build(llm);
    const out = await svc.generate(req);
    expect(out).toEqual({ text: 'LLM letter', provider: 'claude' });
  });

  it('Generate_FallsBackToTemplateWhenNoProvider', async () => {
    const provider: LlmProvider = {
      id: 'claude',
      label: 'Claude',
      available: false,
      generate: async () => result('unused'),
    };
    const llm = new LlmService({
      providers: [provider],
      defaultProvider: 'claude',
      logger: noopLogger,
    });
    const { svc } = build(llm);
    const out = await svc.generate(req);
    expect(out.provider).toBe('template');
    expect(out.text).toContain('Celonis');
    expect(out.text).toContain('Suhay Sevinc');
  });

  it('Generate_WithOverride_UsesUserKeyAndProviderEvenWhenServerUnavailable', async () => {
    let usedKey: string | undefined;
    const provider: LlmProvider = {
      id: 'claude',
      label: 'Claude',
      available: false, // no server credentials
      generate: async (input) => {
        usedKey = input.apiKey;
        return result('user-key letter');
      },
    };
    const llm = new LlmService({
      providers: [provider],
      defaultProvider: 'claude',
      logger: noopLogger,
    });
    const { svc } = build(llm);
    const out = await svc.generate(req, { provider: 'claude', apiKey: 'sk-user' });
    expect(out).toEqual({ text: 'user-key letter', provider: 'claude' });
    expect(usedKey).toBe('sk-user');
  });

  it('Generate_WithUserId_MetersTheCall', async () => {
    const provider: LlmProvider = {
      id: 'claude',
      label: 'Claude',
      available: true,
      generate: async () => result('LLM letter', 40, 90),
    };
    const llm = new LlmService({
      providers: [provider],
      defaultProvider: 'claude',
      logger: noopLogger,
    });
    const { svc, usageMeter } = build(llm);
    await svc.generate(req, undefined, 'user-1');
    const events = await usageMeter.list('user-1');
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      provider: 'claude',
      feature: 'coverLetter',
      inputTokens: 40,
      outputTokens: 90,
    });
  });

  it('Generate_WithoutUserId_DoesNotMeter', async () => {
    const provider: LlmProvider = {
      id: 'claude',
      label: 'Claude',
      available: true,
      generate: async () => result('LLM letter', 40, 90),
    };
    const llm = new LlmService({
      providers: [provider],
      defaultProvider: 'claude',
      logger: noopLogger,
    });
    const { svc, usageMeter } = build(llm);
    await svc.generate(req);
    expect(usageMeter.events).toHaveLength(0);
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
    const { svc } = build(llm);
    const out = await svc.generate(req);
    expect(out.provider).toBe('template');
  });
});

describe('cover-letter domain', () => {
  it('Template_WeavesCompanyRoleAndSkills', () => {
    const text = coverLetterTemplate(req, candidate);
    expect(text).toContain('Celonis');
    expect(text).toContain('Senior C++ Engineer');
    expect(text).toContain('C++ and gRPC');
    expect(text.trim().endsWith('Suhay Sevinc')).toBe(true);
  });

  it('Prompt_IncludesStructuredFacts', () => {
    const { system, prompt } = coverLetterPrompt(req, candidate);
    expect(system).toContain('English');
    expect(prompt).toContain('Celonis');
    expect(prompt).toContain('C++, gRPC');
  });

  it('Template_German_ProducesGermanLetter', () => {
    const text = coverLetterTemplate({ ...req, city: 'Zürich' }, candidate, 'de');
    expect(text).toContain('Sehr geehrtes Team von Celonis');
    expect(text).toContain('in Zürich');
    expect(text).toContain('C++ und gRPC');
    expect(text.trim().endsWith('Suhay Sevinc')).toBe(true);
  });

  it('Prompt_German_AsksForGermanOutput', () => {
    const { system } = coverLetterPrompt(req, candidate, 'de');
    expect(system).toContain('Deutsch');
  });

  it('Template_NoSkills_UsesDefaultFocus', () => {
    expect(coverLetterTemplate({ ...req, skills: [] }, candidate)).toContain(
      'Software Engineering',
    );
    expect(coverLetterTemplate({ ...req, skills: [] }, candidate, 'de')).toContain(
      'Software Engineering',
    );
  });

  it('Template_German_NoCity_OmitsLocation', () => {
    const text = coverLetterTemplate({ ...req, city: undefined }, candidate, 'de');
    expect(text).toContain('Sehr geehrtes Team von Celonis');
    expect(text).not.toContain(' in undefined');
  });

  it('Prompt_NoSkills_UsesDash', () => {
    expect(coverLetterPrompt({ ...req, skills: [] }, candidate).prompt).toContain('—');
  });
});
