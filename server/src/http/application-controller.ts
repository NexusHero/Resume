import type { Request, Response } from 'express';
import {
  createApplicationSchema,
  updateApplicationSchema,
  buildApplicationSchema,
} from '../domain/application.js';
import type { ApplicationService } from '../services/application-service.js';

/** Translates HTTP requests into ApplicationService calls. Validation throws ZodError. */
export class ApplicationController {
  private readonly service: ApplicationService;

  constructor(deps: { applicationService: ApplicationService }) {
    this.service = deps.applicationService;
  }

  list = async (_req: Request, res: Response): Promise<void> => {
    res.json(await this.service.list());
  };

  history = async (_req: Request, res: Response): Promise<void> => {
    res.json(await this.service.history());
  };

  create = async (req: Request, res: Response): Promise<void> => {
    const input = createApplicationSchema.parse(req.body);
    const application = await this.service.create(input);
    res.status(201).json({ application });
  };

  build = async (req: Request, res: Response): Promise<void> => {
    const input = buildApplicationSchema.parse(req.body);
    const result = await this.service.build(input);
    res.status(201).json(result);
  };

  update = async (req: Request, res: Response): Promise<void> => {
    const input = updateApplicationSchema.parse(req.body);
    const application = await this.service.update(req.params.id as string, input);
    res.json({ application });
  };
}
