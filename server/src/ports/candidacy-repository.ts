import type { Candidacy } from '../domain/candidacy';

/**
 * Persistence of pipeline candidacies (talent ↔ mandate links), scoped to an
 * owner. Unique per (ownerId, mandateId, talentId).
 */
export interface CandidacyRepository {
  listForMandate(ownerId: string, mandateId: string): Promise<Candidacy[]>;
  listForTalent(ownerId: string, talentId: string): Promise<Candidacy[]>;
  findById(ownerId: string, id: string): Promise<Candidacy | null>;
  findByMandateAndTalent(
    ownerId: string,
    mandateId: string,
    talentId: string,
  ): Promise<Candidacy | null>;
  add(candidacy: Candidacy): Promise<void>;
  update(candidacy: Candidacy): Promise<void>;
  remove(ownerId: string, id: string): Promise<boolean>;
  /** Cascade: drop a talent's candidacies when the talent is removed. */
  removeForTalent(ownerId: string, talentId: string): Promise<void>;
  /** Cascade: drop a mandate's candidacies when the mandate is removed. */
  removeForMandate(ownerId: string, mandateId: string): Promise<void>;
  /** Drop every candidacy an owner has (DSGVO account erasure). */
  removeForOwner(ownerId: string): Promise<void>;
}
