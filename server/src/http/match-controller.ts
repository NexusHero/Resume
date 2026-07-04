import type { Request, Response } from 'express';
import { matchRequestSchema } from '../domain/match.js';
import type { MatchService } from '../services/match-service.js';
import { currentScope } from './current-user.js';

/** Mandate → shortlist ranking under /api/v1/mandates/:id/match. */
export class MatchController {
  private readonly service: MatchService;

  constructor(deps: { matchService: MatchService }) {
    this.service = deps.matchService;
  }

  match = async (req: Request, res: Response): Promise<void> => {
    const { jobText, limit } = matchRequestSchema.parse(req.body);
    const matches = await this.service.rankForMandate(
      currentScope(req),
      req.params.id as string,
      jobText,
      limit,
    );
    res.json({ matches });
  };
}
