import type { Request, Response } from 'express';
import { updateAssistantSettingsSchema } from '../domain/assistant.js';
import { ValidationError } from '../domain/errors.js';
import type { AssistantService } from '../services/assistant-service.js';
import { currentScope } from './current-user.js';

/**
 * The assistant's HTTP surface (all authenticated, team-scoped):
 *
 *   GET  /assistant                        → settings + queue counts
 *   PUT  /assistant                        → update settings (enable, mode, interval)
 *   POST /assistant/run                    → run the playbook now
 *   GET  /assistant/suggestions            → the suggestion queue (newest first)
 *   POST /assistant/suggestions/:id/accept → apply + resolve a suggestion
 *   POST /assistant/suggestions/:id/dismiss → resolve without applying
 */
export class AssistantController {
  private readonly service: AssistantService;

  constructor(deps: { assistantService: AssistantService }) {
    this.service = deps.assistantService;
  }

  overview = async (req: Request, res: Response): Promise<void> => {
    const scope = currentScope(req);
    const [settings, suggestions] = await Promise.all([
      this.service.getSettings(scope),
      this.service.list(scope),
    ]);
    const counts = { proposed: 0, accepted: 0, dismissed: 0, autoApplied: 0 };
    for (const s of suggestions) {
      if (s.status === 'proposed') counts.proposed += 1;
      else if (s.status === 'accepted') counts.accepted += 1;
      else if (s.status === 'dismissed') counts.dismissed += 1;
      else counts.autoApplied += 1;
    }
    res.json({ settings, counts });
  };

  updateSettings = async (req: Request, res: Response): Promise<void> => {
    const input = updateAssistantSettingsSchema.parse(req.body);
    res.json({ settings: await this.service.updateSettings(currentScope(req), input) });
  };

  run = async (req: Request, res: Response): Promise<void> => {
    const scope = currentScope(req);
    const settings = await this.service.getSettings(scope);
    if (!settings.enabled) {
      throw new ValidationError('The assistant is switched off — enable it first.');
    }
    res.json(await this.service.run(scope));
  };

  list = async (req: Request, res: Response): Promise<void> => {
    res.json(await this.service.list(currentScope(req)));
  };

  accept = async (req: Request, res: Response): Promise<void> => {
    res.json({
      suggestion: await this.service.accept(currentScope(req), req.params.id as string),
    });
  };

  dismiss = async (req: Request, res: Response): Promise<void> => {
    res.json({
      suggestion: await this.service.dismiss(currentScope(req), req.params.id as string),
    });
  };

  /** GET /assistant/suggestions/:id/dossier.pdf — the staged application's Mappe. */
  applicationDossier = async (req: Request, res: Response): Promise<void> => {
    const pdf = await this.service.renderApplicationDossier(
      currentScope(req),
      req.params.id as string,
    );
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename="bewerbungsmappe.pdf"');
    res.send(pdf);
  };
}
