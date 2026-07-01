import type { Request, Response } from 'express';
import type { AccountService } from '../services/account-service';
import type { Clock } from '../ports/clock';
import type { AppConfig } from '../config';
import { currentUserId, currentScope } from './current-user';

/**
 * DSGVO account endpoints under /api/v1/account: export everything the
 * signed-in recruiter owns, and erase the account entirely.
 */
export class AccountController {
  private readonly service: AccountService;
  private readonly clock: Clock;
  private readonly cookieName: string;

  constructor(deps: { accountService: AccountService; clock: Clock; config: AppConfig }) {
    this.service = deps.accountService;
    this.clock = deps.clock;
    this.cookieName = deps.config.auth.sessionCookieName;
  }

  export = async (req: Request, res: Response): Promise<void> => {
    const data = await this.service.exportFor(
      currentUserId(req),
      currentScope(req),
      this.clock.isoNow(),
    );
    // Offer it as a download — a portable JSON file the recruiter can keep.
    res.setHeader('Content-Disposition', 'attachment; filename="myjob-export.json"');
    res.json(data);
  };

  remove = async (req: Request, res: Response): Promise<void> => {
    await this.service.erase(currentUserId(req));
    res.clearCookie(this.cookieName, { path: '/' });
    res.sendStatus(204);
  };
}
