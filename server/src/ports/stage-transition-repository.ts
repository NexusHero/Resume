import type { StageTransition } from '../domain/stage-history';

/** Persistence of the pipeline's stage-transition log, scoped to an owner. */
export interface StageTransitionRepository {
  /** Every transition of the owner, oldest first. */
  list(ownerId: string): Promise<StageTransition[]>;
  add(transition: StageTransition): Promise<void>;
}
