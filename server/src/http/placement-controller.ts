import type { Request, Response } from 'express';
import { createPlacementSchema, updatePlacementSchema } from '../domain/placement';
import type { PlacementService } from '../services/placement-service';
import { currentScope } from './current-user';

/** CRUD for booked placements under /api/v1/placements. */
export class PlacementController {
  private readonly service: PlacementService;

  constructor(deps: { placementService: PlacementService }) {
    this.service = deps.placementService;
  }

  list = async (req: Request, res: Response): Promise<void> => {
    res.json(await this.service.list(currentScope(req)));
  };

  create = async (req: Request, res: Response): Promise<void> => {
    const input = createPlacementSchema.parse(req.body);
    res.status(201).json({ placement: await this.service.create(currentScope(req), input) });
  };

  update = async (req: Request, res: Response): Promise<void> => {
    const patch = updatePlacementSchema.parse(req.body);
    res.json({
      placement: await this.service.update(currentScope(req), req.params.id as string, patch),
    });
  };

  remove = async (req: Request, res: Response): Promise<void> => {
    await this.service.remove(currentScope(req), req.params.id as string);
    res.sendStatus(204);
  };
}
