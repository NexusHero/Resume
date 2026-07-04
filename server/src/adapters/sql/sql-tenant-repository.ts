import { eq, asc } from 'drizzle-orm';
import type { TenantRepository } from '../../ports/tenant-repository.js';
import type { Tenant, TenantStatus } from '../../domain/tenant.js';
import type { Db } from './db.js';
import { tenants } from './schema.js';

/** Postgres-backed tenant records — shared across instances. */
export class SqlTenantRepository implements TenantRepository {
  private readonly db: Db;

  constructor(deps: { db: Db }) {
    this.db = deps.db;
  }

  async create(tenant: Tenant): Promise<void> {
    await this.db.insert(tenants).values({
      id: tenant.id,
      name: tenant.name,
      createdAt: tenant.createdAt,
      status: tenant.status,
    });
  }

  async findById(id: string): Promise<Tenant | null> {
    const rows = await this.db.select().from(tenants).where(eq(tenants.id, id));
    const row = rows[0];
    return row ? this.rowToTenant(row) : null;
  }

  async list(): Promise<Tenant[]> {
    const rows = await this.db.select().from(tenants).orderBy(asc(tenants.createdAt));
    return rows.map((r) => this.rowToTenant(r));
  }

  async setStatus(id: string, status: TenantStatus): Promise<boolean> {
    const rows = await this.db
      .update(tenants)
      .set({ status })
      .where(eq(tenants.id, id))
      .returning();
    return rows.length > 0;
  }

  private rowToTenant(row: typeof tenants.$inferSelect): Tenant {
    return {
      id: row.id,
      name: row.name,
      createdAt: row.createdAt,
      status: row.status as TenantStatus,
    };
  }
}
