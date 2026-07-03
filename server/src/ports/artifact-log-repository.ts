import type { ArtifactLog } from '../domain/artifact';

/** Persistence of the AI-artifact outcome log, scoped to an owner. */
export interface ArtifactLogRepository {
  /** Every artifact of the owner, newest first. */
  list(ownerId: string): Promise<ArtifactLog[]>;
  /** A talent's artifacts, newest first. */
  listForTalent(ownerId: string, talentId: string): Promise<ArtifactLog[]>;
  findById(ownerId: string, id: string): Promise<ArtifactLog | null>;
  add(log: ArtifactLog): Promise<void>;
  update(log: ArtifactLog): Promise<void>;
}
