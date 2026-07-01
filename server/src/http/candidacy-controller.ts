import type { Request, Response } from 'express';
import { addCandidacySchema, updateCandidacySchema } from '../domain/candidacy';
import type { CandidacyService } from '../services/candidacy-service';
import { currentScope } from './current-user';

/** The recruiting pipeline: talents in a mandate's stages (owner-scoped). */
export class CandidacyController {
  private readonly service: CandidacyService;

  constructor(deps: { candidacyService: CandidacyService }) {
    this.service = deps.candidacyService;
  }

  /** GET /mandates/:id/candidacies — the board for a mandate. */
  board = async (req: Request, res: Response): Promise<void> => {
    res.json(await this.service.board(currentScope(req), req.params.id as string));
  };

  /** POST /mandates/:id/candidacies — add a talent to the pipeline. */
  add = async (req: Request, res: Response): Promise<void> => {
    const input = addCandidacySchema.parse(req.body);
    const candidacy = await this.service.add(currentScope(req), req.params.id as string, input);
    res.status(201).json({ candidacy });
  };

  /** GET /talents/:id/candidacies — the mandates a talent is a candidate for. */
  forTalent = async (req: Request, res: Response): Promise<void> => {
    res.json(await this.service.forTalent(currentScope(req), req.params.id as string));
  };

  /** PATCH /candidacies/:id — move stage / reorder / annotate. */
  update = async (req: Request, res: Response): Promise<void> => {
    const patch = updateCandidacySchema.parse(req.body);
    const candidacy = await this.service.update(currentScope(req), req.params.id as string, patch);
    res.json({ candidacy });
  };

  /** DELETE /candidacies/:id — remove from the pipeline. */
  remove = async (req: Request, res: Response): Promise<void> => {
    await this.service.remove(currentScope(req), req.params.id as string);
    res.sendStatus(204);
  };
}
