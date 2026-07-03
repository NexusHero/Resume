import { eq } from 'drizzle-orm';
import type { StageTransition } from '../../domain/stage-history';
import type { StageTransitionRepository } from '../../ports/stage-transition-repository';
import type { Db } from './db';
import { stageTransitions } from './schema';
import { rowToStageTransition, stageTransitionToRow } from './mappers';

/** Postgres-backed stage-transition log. */
export class SqlStageTransitionRepository implements StageTransitionRepository {
  private readonly db: Db;

  constructor(deps: { db: Db }) {
    this.db = deps.db;
  }

  async list(ownerId: string): Promise<StageTransition[]> {
    const rows = await this.db
      .select()
      .from(stageTransitions)
      .where(eq(stageTransitions.ownerId, ownerId));
    return rows.map(rowToStageTransition).sort((a, b) => a.at.localeCompare(b.at));
  }

  async add(transition: StageTransition): Promise<void> {
    await this.db.insert(stageTransitions).values(stageTransitionToRow(transition));
  }
}
