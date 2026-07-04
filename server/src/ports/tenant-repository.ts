import type { Tenant, TenantStatus } from '../domain/tenant.js';

/**
 * Persistence of tenant records (ADR-0036). Self-serve registration creates
 * them; the super-admin lists and suspends them. The implicit `DEFAULT_TENANT`
 * has no row here unless one is created for it.
 */
export interface TenantRepository {
  create(tenant: Tenant): Promise<void>;
  findById(id: string): Promise<Tenant | null>;
  /** All tenants, oldest first. */
  list(): Promise<Tenant[]>;
  /** Set a tenant's status (active/suspended); returns whether a row changed. */
  setStatus(id: string, status: TenantStatus): Promise<boolean>;
}
