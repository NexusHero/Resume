import type { TenantInvite } from '../domain/tenant-invite.js';

/**
 * Persistence of pending tenant invitations (ADR-0035). Invites are keyed by
 * their opaque token. TTL is enforced by the service (it owns the clock), so
 * the store is a plain keyed collection; `consume` deletes and returns the
 * record so acceptance is single-use.
 */
export interface InviteRepository {
  /** Store a fresh invitation. */
  create(invite: TenantInvite): Promise<void>;
  /** Find and atomically delete an invite by token (single-use accept). */
  consume(token: string): Promise<TenantInvite | null>;
  /** Pending invitations for a tenant, newest first. */
  listByTenant(tenantId: string): Promise<TenantInvite[]>;
}
