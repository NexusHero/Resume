import { eq, desc } from 'drizzle-orm';
import type { InviteRepository } from '../../ports/invite-repository.js';
import type { TenantInvite } from '../../domain/tenant-invite.js';
import type { Role } from '../../domain/user.js';
import type { Db } from './db.js';
import { tenantInvites } from './schema.js';

/**
 * Postgres-backed tenant invitations — mirrors the file-backed store but shared
 * across server instances. Single-use on consume; TTL is enforced by the service.
 */
export class SqlInviteRepository implements InviteRepository {
  private readonly db: Db;

  constructor(deps: { db: Db }) {
    this.db = deps.db;
  }

  async create(invite: TenantInvite): Promise<void> {
    await this.db.insert(tenantInvites).values({
      token: invite.token,
      email: invite.email,
      tenantId: invite.tenantId,
      roles: invite.roles,
      invitedBy: invite.invitedBy,
      createdAt: invite.createdAt,
    });
  }

  async consume(token: string): Promise<TenantInvite | null> {
    const rows = await this.db
      .delete(tenantInvites)
      .where(eq(tenantInvites.token, token))
      .returning();
    const row = rows[0];
    return row ? this.rowToInvite(row) : null;
  }

  async listByTenant(tenantId: string): Promise<TenantInvite[]> {
    const rows = await this.db
      .select()
      .from(tenantInvites)
      .where(eq(tenantInvites.tenantId, tenantId))
      .orderBy(desc(tenantInvites.createdAt));
    return rows.map((r) => this.rowToInvite(r));
  }

  private rowToInvite(row: typeof tenantInvites.$inferSelect): TenantInvite {
    return {
      token: row.token,
      email: row.email,
      tenantId: row.tenantId,
      roles: row.roles as Role[],
      invitedBy: row.invitedBy,
      createdAt: row.createdAt,
    };
  }
}
