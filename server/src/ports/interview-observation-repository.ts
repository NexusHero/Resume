import type { InterviewObservation } from '../domain/interview-observation.js';

/**
 * Persistence of recorded interview experiences, team-scoped. Observations are
 * aggregate company intelligence (not a candidate's personal footprint), so
 * they live with the team's data.
 */
export interface InterviewObservationRepository {
  add(observation: InterviewObservation): Promise<void>;
  /** All observations for a company (by normalized key), newest first. */
  listForCompany(ownerId: string, companyKey: string): Promise<InterviewObservation[]>;
  /** Every observation the team has recorded. */
  list(ownerId: string): Promise<InterviewObservation[]>;
}
