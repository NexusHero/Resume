import type { Request, Response } from 'express';
import { requestResetSchema, confirmResetSchema } from '../domain/password-reset.js';
import type { PasswordResetService } from '../services/password-reset-service.js';

/**
 * Password-reset endpoints under /api/v1/auth/password-reset. The request route
 * always returns 202 (never reveals whether the email is registered); the
 * confirm route sets the new password or 401s on a bad/expired token.
 */
export class PasswordResetController {
  private readonly service: PasswordResetService;

  constructor(deps: { passwordResetService: PasswordResetService }) {
    this.service = deps.passwordResetService;
  }

  request = async (req: Request, res: Response): Promise<void> => {
    const { email } = requestResetSchema.parse(req.body);
    await this.service.request(email);
    res.status(202).json({ ok: true });
  };

  confirm = async (req: Request, res: Response): Promise<void> => {
    const { token, password } = confirmResetSchema.parse(req.body);
    await this.service.confirm(token, password);
    res.sendStatus(204);
  };
}
