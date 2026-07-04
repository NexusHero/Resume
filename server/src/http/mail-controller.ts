import type { Request, Response } from 'express';
import { sendOutreachSchema } from '../domain/mail-sync.js';
import type { MailService } from '../services/mail-service.js';
import { currentScope } from './current-user.js';

/**
 * The email integration's HTTP surface (authenticated, team-scoped):
 *
 *   POST /talents/:id/outreach/send → send a drafted outreach email
 *   POST /mail/sync-replies         → one reply-detection pass, on demand
 *   GET  /mail/status               → transport + reply-sync configuration
 */
export class MailController {
  private readonly mailService: MailService;

  constructor(deps: { mailService: MailService }) {
    this.mailService = deps.mailService;
  }

  sendOutreach = async (req: Request, res: Response): Promise<void> => {
    const input = sendOutreachSchema.parse(req.body);
    res.json(
      await this.mailService.sendOutreach(currentScope(req), req.params.id as string, input),
    );
  };

  syncReplies = async (req: Request, res: Response): Promise<void> => {
    res.json(await this.mailService.syncReplies(currentScope(req)));
  };

  status = async (_req: Request, res: Response): Promise<void> => {
    res.json(this.mailService.status());
  };
}
