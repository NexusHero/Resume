import type { TalentDocuments } from '../domain/talent-documents';

/**
 * Persistence of a talent's document set (resume + cover letter + style),
 * scoped to an owner. One set per (ownerId, talentId).
 */
export interface DocumentRepository {
  get(ownerId: string, talentId: string): Promise<TalentDocuments | null>;
  save(documents: TalentDocuments): Promise<void>;
  /** Drop a single talent's documents (cascade when the talent is removed). */
  removeForTalent(ownerId: string, talentId: string): Promise<void>;
  /** Drop every document set an owner has (DSGVO account erasure). */
  removeForOwner(ownerId: string): Promise<void>;
}
