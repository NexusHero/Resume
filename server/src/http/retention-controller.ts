import type { Request, Response } from 'express';
import { updateRetentionPolicySchema } from '../domain/retention.js';
import type { RetentionService } from '../services/retention-service.js';
import { currentScope } from './current-user.js';

/** DSGVO retention: review report, policy + anonymize actions. Admin-only, gated at the route (requireCan). */
export class RetentionController {
  private readonly service: RetentionService;

  constructor(deps: { retentionService: RetentionService }) {
    this.service = deps.retentionService;
  }

  /** GET /retention/report?days=180 — candidates due for a retention review. */
  report = async (req: Request, res: Response): Promise<void> => {
    const days = Number.parseInt(String(req.query.days ?? ''), 10);
    const reviewDays = Number.isFinite(days) && days >= 0 ? days : undefined;
    res.json(await this.service.report(currentScope(req), reviewDays));
  };

  /** GET /retention/policy — the team's review window, deletion deadline, auto-anonymize. */
  getPolicy = async (req: Request, res: Response): Promise<void> => {
    res.json(await this.service.getPolicy(currentScope(req)));
  };

  /** PUT /retention/policy — update the retention policy. */
  updatePolicy = async (req: Request, res: Response): Promise<void> => {
    const patch = updateRetentionPolicySchema.parse(req.body);
    res.json(await this.service.updatePolicy(currentScope(req), patch));
  };

  /** POST /talents/:id/anonymize — strip a candidate's personal data. */
  anonymize = async (req: Request, res: Response): Promise<void> => {
    const talent = await this.service.anonymize(currentScope(req), req.params.id as string);
    res.json({ talent });
  };

  /** POST /retention/anonymize-overdue — clear every candidate past the deadline. */
  anonymizeOverdue = async (req: Request, res: Response): Promise<void> => {
    res.json(await this.service.anonymizeOverdue(currentScope(req)));
  };
}
