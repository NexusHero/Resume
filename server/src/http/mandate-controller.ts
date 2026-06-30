import type { Request, Response } from 'express';
import { createMandateSchema, updateMandateSchema } from '../domain/mandate';
import type { MandateService } from '../services/mandate-service';
import { currentUserId } from './current-user';

/** CRUD for client mandates under /api/v1/mandates. */
export class MandateController {
  private readonly service: MandateService;

  constructor(deps: { mandateService: MandateService }) {
    this.service = deps.mandateService;
  }

  list = async (req: Request, res: Response): Promise<void> => {
    res.json(await this.service.list(currentUserId(req)));
  };

  create = async (req: Request, res: Response): Promise<void> => {
    const input = createMandateSchema.parse(req.body);
    res.status(201).json({ mandate: await this.service.create(currentUserId(req), input) });
  };

  update = async (req: Request, res: Response): Promise<void> => {
    const patch = updateMandateSchema.parse(req.body);
    res.json({
      mandate: await this.service.update(currentUserId(req), req.params.id as string, patch),
    });
  };

  remove = async (req: Request, res: Response): Promise<void> => {
    await this.service.remove(currentUserId(req), req.params.id as string);
    res.sendStatus(204);
  };
}
