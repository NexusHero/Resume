import type { Request, Response } from 'express';
import { createTalentSchema, updateTalentSchema } from '../domain/talent';
import type { TalentService } from '../services/talent-service';
import { currentUserId } from './current-user';

/** CRUD for the talent pool under /api/v1/talents. */
export class TalentController {
  private readonly service: TalentService;

  constructor(deps: { talentService: TalentService }) {
    this.service = deps.talentService;
  }

  list = async (req: Request, res: Response): Promise<void> => {
    res.json(await this.service.list(currentUserId(req)));
  };

  create = async (req: Request, res: Response): Promise<void> => {
    const input = createTalentSchema.parse(req.body);
    res.status(201).json({ talent: await this.service.create(currentUserId(req), input) });
  };

  update = async (req: Request, res: Response): Promise<void> => {
    const patch = updateTalentSchema.parse(req.body);
    res.json({
      talent: await this.service.update(currentUserId(req), req.params.id as string, patch),
    });
  };

  remove = async (req: Request, res: Response): Promise<void> => {
    await this.service.remove(currentUserId(req), req.params.id as string);
    res.sendStatus(204);
  };
}
