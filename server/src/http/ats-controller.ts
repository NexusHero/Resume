import type { Request, Response } from 'express';
import { atsRequestSchema } from '../domain/ats';
import type { AtsService } from '../services/ats-service';

/** POST /api/v1/ats — keyword gap analysis of a posting against the profile. */
export class AtsController {
  private readonly service: AtsService;

  constructor(deps: { atsService: AtsService }) {
    this.service = deps.atsService;
  }

  analyze = async (req: Request, res: Response): Promise<void> => {
    const input = atsRequestSchema.parse(req.body);
    res.json(this.service.analyze(input));
  };
}
