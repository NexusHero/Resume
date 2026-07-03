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

  /** GET /settings/usage/audit — the caller's per-call AI audit trail (JSON). */
  audit = async (req: Request, res: Response): Promise<void> => {
    res.json(await this.service.auditFor(currentUserId(req)));
  };

  /** GET /settings/usage/audit.csv — the audit trail as a downloadable CSV. */
  auditCsv = async (req: Request, res: Response): Promise<void> => {
    const csv = await this.service.auditCsvFor(currentUserId(req));
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="ai-audit-trail.csv"');
    res.send(csv);
  };
}
