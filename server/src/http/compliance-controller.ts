import type { Request, Response } from 'express';
import { aggCheckSchema, checkAgg } from '../domain/agg-check';

/** Compliance tooling under /api/v1/compliance. */
export class ComplianceController {
  /** POST /compliance/agg-check — scan a job ad / outreach text for AGG risks. */
  aggCheck = async (req: Request, res: Response): Promise<void> => {
    const { text } = aggCheckSchema.parse(req.body);
    res.json(checkAgg(text));
  };
}
