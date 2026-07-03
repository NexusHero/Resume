import type { Request, Response } from 'express';
import { ForbiddenError } from '../domain/errors';
import { updateRetentionPolicySchema } from '../domain/retention';
import type { RetentionService } from '../services/retention-service';
import type { Authorizer } from '../ports/authorizer';
import { currentScope, currentPrincipal } from './current-user';

/** DSGVO retention: review report, policy + anonymize actions (admin only). */
export class RetentionController {
  private readonly service: RetentionService;
  private readonly authz: Authorizer;

  constructor(deps: { retentionService: RetentionService; authorizer: Authorizer }) {
    this.service = deps.retentionService;
    this.authz = deps.authorizer;
  }

  private require(req: Request, action: string): void {
    if (!this.authz.check(currentPrincipal(req), { kind: 'retention' }, action)) {
      throw new ForbiddenError();
    }
  }

  /** GET /retention/report?days=180 — candidates due for a retention review. */
  report = async (req: Request, res: Response): Promise<void> => {
    this.require(req, 'read');
    const days = Number.parseInt(String(req.query.days ?? ''), 10);
    const reviewDays = Number.isFinite(days) && days >= 0 ? days : undefined;
    res.json(await this.service.report(currentScope(req), reviewDays));
  };

  /** GET /retention/policy — the team's review window, deletion deadline, auto-anonymize. */
  getPolicy = async (req: Request, res: Response): Promise<void> => {
    this.require(req, 'read');
    res.json(await this.service.getPolicy(currentScope(req)));
  };

  /** PUT /retention/policy — update the retention policy. */
  updatePolicy = async (req: Request, res: Response): Promise<void> => {
    this.require(req, 'anonymize');
    const patch = updateRetentionPolicySchema.parse(req.body);
    res.json(await this.service.updatePolicy(currentScope(req), patch));
  };

  /** POST /talents/:id/anonymize — strip a candidate's personal data. */
  anonymize = async (req: Request, res: Response): Promise<void> => {
    this.require(req, 'anonymize');
    const talent = await this.service.anonymize(currentScope(req), req.params.id as string);
    res.json({ talent });
  };

  /** POST /retention/anonymize-overdue — clear every candidate past the deadline. */
  anonymizeOverdue = async (req: Request, res: Response): Promise<void> => {
    this.require(req, 'anonymize');
    res.json(await this.service.anonymizeOverdue(currentScope(req)));
  };
}
