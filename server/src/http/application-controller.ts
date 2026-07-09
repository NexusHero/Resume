import type { Request, Response } from 'express';
import {
  createApplicationSchema,
  updateApplicationSchema,
  buildApplicationSchema,
} from '../domain/application.js';
import type { ApplicationService } from '../services/application-service.js';
import { currentScope } from './current-user.js';

/** Translates HTTP requests into ApplicationService calls. Validation throws ZodError. */
export class ApplicationController {
  private readonly service: ApplicationService;

  constructor(deps: { applicationService: ApplicationService }) {
    this.service = deps.applicationService;
  }

  list = async (req: Request, res: Response): Promise<void> => {
    res.json(await this.service.list(currentScope(req)));
  };

  history = async (req: Request, res: Response): Promise<void> => {
    res.json(await this.service.history(currentScope(req)));
  };

  create = async (req: Request, res: Response): Promise<void> => {
    const input = createApplicationSchema.parse(req.body);
    const application = await this.service.create(currentScope(req), input);
    res.status(201).json({ application });
  };

  build = async (req: Request, res: Response): Promise<void> => {
    const input = buildApplicationSchema.parse(req.body);
    const result = await this.service.build(currentScope(req), input);
    res.status(201).json(result);
  };

  update = async (req: Request, res: Response): Promise<void> => {
    const input = updateApplicationSchema.parse(req.body);
    const application = await this.service.update(
      currentScope(req),
      req.params.id as string,
      input,
    );
    res.json({ application });
  };
}
