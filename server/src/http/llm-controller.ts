import { z } from 'zod';
import type { Request, Response } from 'express';
import { coverLetterRequestSchema } from '../domain/cover-letter';
import type { LlmService } from '../services/llm-service';
import type { CoverLetterService } from '../services/cover-letter-service';

const setProviderSchema = z.object({ provider: z.string().min(1) });

/**
 * LLM provider settings + cover-letter generation.
 *
 *   GET  /api/v1/settings/llm   → current provider + availability
 *   PUT  /api/v1/settings/llm   → switch provider
 *   POST /api/v1/cover-letter   → generate a tailored Anschreiben
 */
export class LlmController {
  private readonly llm: LlmService;
  private readonly coverLetter: CoverLetterService;

  constructor(deps: { llmService: LlmService; coverLetterService: CoverLetterService }) {
    this.llm = deps.llmService;
    this.coverLetter = deps.coverLetterService;
  }

  settings = async (_req: Request, res: Response): Promise<void> => {
    res.json(this.llm.settings());
  };

  setProvider = async (req: Request, res: Response): Promise<void> => {
    const { provider } = setProviderSchema.parse(req.body);
    res.json(this.llm.setProvider(provider));
  };

  generateCoverLetter = async (req: Request, res: Response): Promise<void> => {
    const input = coverLetterRequestSchema.parse(req.body);
    res.json(await this.coverLetter.generate(input));
  };
}
