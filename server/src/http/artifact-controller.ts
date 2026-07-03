import type { Request, Response } from 'express';
import { setOutcomeSchema, summarizeArtifacts } from '../domain/artifact';
import { NotFoundError } from '../domain/errors';
import type { ArtifactLogRepository } from '../ports/artifact-log-repository';
import type { Clock } from '../ports/clock';
import { currentScope } from './current-user';

/**
 * The outcome loop's HTTP surface (authenticated, team-scoped):
 *
 *   GET  /artifacts?talentId=…    → generated artifacts, newest first
 *   GET  /artifacts/stats         → reply rates by kind / provider / channel
 *   POST /artifacts/:id/outcome   → stamp what happened (replied, no-reply, converted)
 */
export class ArtifactController {
  private readonly artifacts: ArtifactLogRepository;
  private readonly clock: Clock;

  constructor(deps: { artifactLogRepository: ArtifactLogRepository; clock: Clock }) {
    this.artifacts = deps.artifactLogRepository;
    this.clock = deps.clock;
  }

  list = async (req: Request, res: Response): Promise<void> => {
    const scope = currentScope(req);
    const talentId = typeof req.query.talentId === 'string' ? req.query.talentId : '';
    res.json(
      talentId
        ? await this.artifacts.listForTalent(scope, talentId)
        : await this.artifacts.list(scope),
    );
  };

  stats = async (req: Request, res: Response): Promise<void> => {
    res.json(summarizeArtifacts(await this.artifacts.list(currentScope(req))));
  };

  setOutcome = async (req: Request, res: Response): Promise<void> => {
    const scope = currentScope(req);
    const { outcome } = setOutcomeSchema.parse(req.body);
    const log = await this.artifacts.findById(scope, req.params.id as string);
    if (!log) throw new NotFoundError(`Artifact ${req.params.id} not found`);
    const updated = { ...log, outcome, outcomeAt: this.clock.isoNow() };
    await this.artifacts.update(updated);
    res.json({ artifact: updated });
  };
}
