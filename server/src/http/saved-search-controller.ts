import type { Request, Response } from 'express';
import { createSavedSearchSchema } from '../domain/saved-search';
import type { SavedSearchService } from '../services/saved-search-service';

/** CRUD + run for named searches under /api/v1/searches. */
export class SavedSearchController {
  private readonly service: SavedSearchService;

  constructor(deps: { savedSearchService: SavedSearchService }) {
    this.service = deps.savedSearchService;
  }

  list = async (_req: Request, res: Response): Promise<void> => {
    res.json(await this.service.list());
  };

  create = async (req: Request, res: Response): Promise<void> => {
    const input = createSavedSearchSchema.parse(req.body);
    res.status(201).json({ search: await this.service.create(input) });
  };

  remove = async (req: Request, res: Response): Promise<void> => {
    await this.service.remove(req.params.id as string);
    res.sendStatus(204);
  };

  run = async (req: Request, res: Response): Promise<void> => {
    res.json(await this.service.run(req.params.id as string));
  };
}
