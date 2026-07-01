import { and, desc, eq } from 'drizzle-orm';
import type {
  Difficulty,
  InterviewFormat,
  InterviewObservation,
} from '../../domain/interview-observation';
import type { InterviewObservationRepository } from '../../ports/interview-observation-repository';
import type { Db } from './db';
import { interviewObservations } from './schema';

/** Postgres-backed interview-observation repository, team-scoped. */
export class SqlInterviewObservationRepository implements InterviewObservationRepository {
  private readonly db: Db;

  constructor(deps: { db: Db }) {
    this.db = deps.db;
  }

  async add(o: InterviewObservation): Promise<void> {
    await this.db.insert(interviewObservations).values({
      id: o.id,
      ownerId: o.ownerId,
      companyKey: o.companyKey,
      company: o.company,
      mandateId: o.mandateId,
      talentId: o.talentId,
      rounds: o.rounds,
      formats: o.formats,
      difficulty: o.difficulty,
      notes: o.notes,
      at: o.at,
    });
  }

  async listForCompany(ownerId: string, companyKey: string): Promise<InterviewObservation[]> {
    const rows = await this.db
      .select()
      .from(interviewObservations)
      .where(
        and(
          eq(interviewObservations.ownerId, ownerId),
          eq(interviewObservations.companyKey, companyKey),
        ),
      )
      .orderBy(desc(interviewObservations.at));
    return rows.map(rowToObservation);
  }

  async list(ownerId: string): Promise<InterviewObservation[]> {
    const rows = await this.db
      .select()
      .from(interviewObservations)
      .where(eq(interviewObservations.ownerId, ownerId))
      .orderBy(desc(interviewObservations.at));
    return rows.map(rowToObservation);
  }
}

function rowToObservation(r: typeof interviewObservations.$inferSelect): InterviewObservation {
  return {
    id: r.id,
    ownerId: r.ownerId,
    companyKey: r.companyKey,
    company: r.company,
    mandateId: r.mandateId,
    talentId: r.talentId,
    rounds: r.rounds,
    formats: r.formats as InterviewFormat[],
    difficulty: r.difficulty as Difficulty,
    notes: r.notes,
    at: r.at,
  };
}
