import type { Request, Response } from 'express';
import { createTalentSchema, updateTalentSchema } from '../domain/talent';
import type { TalentService } from '../services/talent-service';

/** CRUD for the talent pool under /api/v1/talents. */
export class TalentController {
  private readonly service: TalentService;

  constructor(deps: { talentService: TalentService }) {
    this.service = deps.talentService;
  }

  list = async (_req: Request, res: Response): Promise<void> => {
    res.json(await this.service.list());
  };

  create = async (req: Request, res: Response): Promise<void> => {
    const input = createTalentSchema.parse(req.body);
    res.status(201).json({ talent: await this.service.create(input) });
  };

  update = async (req: Request, res: Response): Promise<void> => {
    const patch = updateTalentSchema.parse(req.body);
    res.json({ talent: await this.service.update(req.params.id as string, patch) });
  };

  remove = async (req: Request, res: Response): Promise<void> => {
    await this.service.remove(req.params.id as string);
    res.sendStatus(204);
  };
}
