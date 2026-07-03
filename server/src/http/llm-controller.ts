import { z } from 'zod';
import type { Request, Response } from 'express';
import { coverLetterRequestSchema } from '../domain/cover-letter';
import { ValidationError } from '../domain/errors';
import type { LlmProviderId } from '../ports/llm-provider';
import type { ApiKeyStore } from '../ports/api-key-store';
import type { UserRepository } from '../ports/user-repository';
import type { LlmService } from '../services/llm-service';
import type { CoverLetterService } from '../services/cover-letter-service';
import { currentUserId, optionalUserId } from './current-user';

const setProviderSchema = z.object({ provider: z.string().min(1) });
const setKeySchema = z.object({ key: z.string().min(1, 'key is required') });
const PROVIDERS: LlmProviderId[] = ['claude', 'gemini'];

function parseProvider(raw: string): LlmProviderId {
  if (!PROVIDERS.includes(raw as LlmProviderId)) {
    throw new ValidationError(`Unknown LLM provider: ${raw}`, { allowed: PROVIDERS });
  }
  return raw as LlmProviderId;
}

/**
 * LLM provider settings, per-user API keys and cover-letter generation.
 *
 *   GET  /settings/llm            → the caller's provider + availability
 *   PUT  /settings/llm            → switch the caller's provider (persisted per user)
 *   GET  /settings/keys           → which providers the user has a key for
 *   PUT  /settings/keys/:provider → store the user's key (encrypted, server-side)
 *   DELETE /settings/keys/:provider → remove it
 *   POST /cover-letter            → generate (uses the user's key when present)
 */
export class LlmController {
  private readonly llm: LlmService;
  private readonly coverLetter: CoverLetterService;
  private readonly keys: ApiKeyStore;
  private readonly users: UserRepository;

  constructor(deps: {
    llmService: LlmService;
    coverLetterService: CoverLetterService;
    apiKeyStore: ApiKeyStore;
    userRepository: UserRepository;
  }) {
    this.llm = deps.llmService;
    this.coverLetter = deps.coverLetterService;
    this.keys = deps.apiKeyStore;
    this.users = deps.userRepository;
  }

  /** The caller's stored provider choice, when signed in and still valid. */
  private async storedProvider(userId: string | undefined): Promise<LlmProviderId | null> {
    if (!userId) return null;
    const user = await this.users.findById(userId);
    return user?.llmProvider && this.llm.get(user.llmProvider) ? user.llmProvider : null;
  }

  settings = async (req: Request, res: Response): Promise<void> => {
    const base = this.llm.settings();
    const stored = await this.storedProvider(optionalUserId(req));
    res.json(stored ? { ...base, current: stored } : base);
  };

  setProvider = async (req: Request, res: Response): Promise<void> => {
    const provider = parseProvider(setProviderSchema.parse(req.body).provider);
    await this.users.setLlmProvider(currentUserId(req), provider);
    res.json({ ...this.llm.settings(), current: provider });
  };

  /** Status only — never returns the stored keys themselves. */
  keysStatus = async (req: Request, res: Response): Promise<void> => {
    const configured = await this.keys.providersFor(currentUserId(req));
    res.json(Object.fromEntries(PROVIDERS.map((p) => [p, configured.includes(p)])));
  };

  setKey = async (req: Request, res: Response): Promise<void> => {
    const provider = parseProvider(req.params.provider as string);
    const { key } = setKeySchema.parse(req.body);
    await this.keys.set(currentUserId(req), provider, key.trim());
    res.sendStatus(204);
  };

  removeKey = async (req: Request, res: Response): Promise<void> => {
    const provider = parseProvider(req.params.provider as string);
    await this.keys.remove(currentUserId(req), provider);
    res.sendStatus(204);
  };

  generateCoverLetter = async (req: Request, res: Response): Promise<void> => {
    const input = coverLetterRequestSchema.parse(req.body);
    // If the request carries a valid session, prefer that user's own key for
    // the currently selected provider over the server's env credentials.
    const userId = optionalUserId(req);
    let override: { provider: LlmProviderId; apiKey: string } | undefined;
    if (userId) {
      const provider = (await this.storedProvider(userId)) ?? this.llm.currentProvider();
      const apiKey = await this.keys.get(userId, provider);
      if (apiKey) override = { provider, apiKey };
    }
    res.json(await this.coverLetter.generate(input, override, userId ?? undefined));
  };
}
