import type { Request, Response } from 'express';
import type { UsageService } from '../services/usage-service';
import { currentUserId } from './current-user';

/** Per-user AI usage summary under /api/v1/settings/usage. */
export class UsageController {
  private readonly service: UsageService;

  constructor(deps: { usageService: UsageService }) {
    this.service = deps.usageService;
  }

  /** GET /settings/usage — the caller's AI requests, tokens and rough cost. */
  summary = async (req: Request, res: Response): Promise<void> => {
    res.json(await this.service.summaryFor(currentUserId(req)));
  };
}
