import type { Request, Response } from 'express';
import { aggCheckSchema, checkAgg, rewriteAgg } from '../domain/agg-check.js';

/** Compliance tooling under /api/v1/compliance. */
export class ComplianceController {
  /** POST /compliance/agg-check — scan a job ad / outreach text for AGG risks. */
  aggCheck = async (req: Request, res: Response): Promise<void> => {
    const { text } = aggCheckSchema.parse(req.body);
    res.json(checkAgg(text));
  };

  /** POST /compliance/agg-rewrite — produce a neutral draft of the text. */
  aggRewrite = async (req: Request, res: Response): Promise<void> => {
    const { text } = aggCheckSchema.parse(req.body);
    res.json(rewriteAgg(text));
  };
}
