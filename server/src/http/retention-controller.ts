import type { Request, Response } from 'express';
import { ForbiddenError } from '../domain/errors';
import { RETENTION_REVIEW_DAYS } from '../domain/retention';
import type { RetentionService } from '../services/retention-service';
import type { Authorizer } from '../ports/authorizer';
import { currentScope, currentPrincipal } from './current-user';

/** DSGVO retention: review report + anonymize action (admin only). */
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
    const reviewDays = Number.isFinite(days) && days >= 0 ? days : RETENTION_REVIEW_DAYS;
    res.json(await this.service.report(currentScope(req), reviewDays));
  };

  /** POST /talents/:id/anonymize — strip a candidate's personal data. */
  anonymize = async (req: Request, res: Response): Promise<void> => {
    this.require(req, 'anonymize');
    const talent = await this.service.anonymize(currentScope(req), req.params.id as string);
    res.json({ talent });
  };
}
