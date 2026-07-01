import { z } from 'zod';
import type { Request, Response } from 'express';
import { coverLetterRequestSchema } from '../domain/cover-letter';
import { ValidationError } from '../domain/errors';
import type { LlmProviderId } from '../ports/llm-provider';
import type { ApiKeyStore } from '../ports/api-key-store';
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
 *   GET  /settings/llm            → current provider + availability
 *   PUT  /settings/llm            → switch provider
 *   GET  /settings/keys           → which providers the user has a key for
 *   PUT  /settings/keys/:provider → store the user's key (encrypted, server-side)
 *   DELETE /settings/keys/:provider → remove it
 *   POST /cover-letter            → generate (uses the user's key when present)
 */
export class LlmController {
  private readonly llm: LlmService;
  private readonly coverLetter: CoverLetterService;
  private readonly keys: ApiKeyStore;

  constructor(deps: {
    llmService: LlmService;
    coverLetterService: CoverLetterService;
    apiKeyStore: ApiKeyStore;
  }) {
    this.llm = deps.llmService;
    this.coverLetter = deps.coverLetterService;
    this.keys = deps.apiKeyStore;
  }

  settings = async (_req: Request, res: Response): Promise<void> => {
    res.json(this.llm.settings());
  };

  setProvider = async (req: Request, res: Response): Promise<void> => {
    const { provider } = setProviderSchema.parse(req.body);
    res.json(this.llm.setProvider(provider));
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
      const provider = this.llm.currentProvider();
      const apiKey = await this.keys.get(userId, provider);
      if (apiKey) override = { provider, apiKey };
    }
    res.json(await this.coverLetter.generate(input, override, userId ?? undefined));
  };
}
