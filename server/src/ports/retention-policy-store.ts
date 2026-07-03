import type { RetentionPolicy } from '../domain/retention';

/** Persistence of the team's retention policy (one row per scope). */
export interface RetentionPolicyStore {
  /** The stored policy, or null when the team never configured retention. */
  get(ownerId: string): Promise<RetentionPolicy | null>;
  set(ownerId: string, policy: RetentionPolicy): Promise<void>;
}
