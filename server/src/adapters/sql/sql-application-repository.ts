import { and, eq } from 'drizzle-orm';
import type { Application } from '../../domain/application.js';
import type { ApplicationRepository } from '../../ports/application-repository.js';
import type { Db } from './db.js';
import { applications } from './schema.js';
import { applicationToRow, rowToApplication } from './mappers.js';

/** Postgres-backed application repository. */
export class SqlApplicationRepository implements ApplicationRepository {
  private readonly db: Db;

  constructor(deps: { db: Db }) {
    this.db = deps.db;
  }

  async list(ownerId: string): Promise<Application[]> {
    const rows = await this.db.select().from(applications).where(eq(applications.ownerId, ownerId));
    return rows.map(rowToApplication);
  }

  async findById(ownerId: string, id: string): Promise<Application | null> {
    const rows = await this.db
      .select()
      .from(applications)
      .where(and(eq(applications.id, id), eq(applications.ownerId, ownerId)));
    return rows[0] ? rowToApplication(rows[0]) : null;
  }

  async add(application: Application): Promise<void> {
    await this.db.insert(applications).values(applicationToRow(application));
  }

  async update(application: Application): Promise<void> {
    const row = applicationToRow(application);
    const updated = await this.db
      .update(applications)
      .set(row)
      .where(
        and(eq(applications.id, application.id), eq(applications.ownerId, application.ownerId)),
      )
      .returning({ id: applications.id });
    // Match the file repository: an update to an unknown id inserts it.
    if (updated.length === 0) await this.db.insert(applications).values(row);
  }
}
