/**
 * A tenant is an isolated workspace (ADR-0036). Until now tenants were only a
 * string stamped on users (ADR-0033); this promotes them to first-class records
 * so they can be listed, named, and suspended. A user's `tenantId` points here;
 * a user without one still belongs to the implicit `DEFAULT_TENANT`.
 */
export type TenantStatus = 'active' | 'suspended';

export interface Tenant {
  id: string;
  name: string;
  createdAt: string; // ISO 8601
  status: TenantStatus;
}

/** A friendly default workspace name derived from the owner's email. */
export function defaultWorkspaceName(email: string): string {
  const local = (email.split('@')[0] || 'My').trim();
  return `${local}'s workspace`;
}

/** A tenant as the super-admin console sees it: the record plus its member count. */
export interface TenantOverview extends Tenant {
  memberCount: number;
}
