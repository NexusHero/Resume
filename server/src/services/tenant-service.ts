import { DEFAULT_TENANT } from '../domain/user';
import type { Tenant, TenantOverview, TenantStatus } from '../domain/tenant';
import { NotFoundError } from '../domain/errors';
import type { TenantRepository } from '../ports/tenant-repository';
import type { UserRepository } from '../ports/user-repository';

export interface TenantServiceDeps {
  tenantRepository: TenantRepository;
  userRepository: UserRepository;
}

/**
 * The super-admin's view across tenants (ADR-0037). Read-only in this slice:
 * list every tenant with its member count. The implicit `DEFAULT_TENANT` has no
 * registry row, so it is synthesised here whenever it still has members — the
 * overview must show the pre-self-serve default team, not hide it.
 */
export class TenantService {
  private readonly tenants: TenantRepository;
  private readonly users: UserRepository;

  constructor(deps: TenantServiceDeps) {
    this.tenants = deps.tenantRepository;
    this.users = deps.userRepository;
  }

  /** All tenants (registry + the implicit default if populated), with counts. */
  async list(): Promise<TenantOverview[]> {
    const [registry, users] = await Promise.all([this.tenants.list(), this.users.list()]);

    const counts = new Map<string, number>();
    for (const u of users) {
      const id = u.tenantId ?? DEFAULT_TENANT;
      counts.set(id, (counts.get(id) ?? 0) + 1);
    }

    const overview: TenantOverview[] = registry.map((t) => ({
      ...t,
      memberCount: counts.get(t.id) ?? 0,
    }));

    // Surface the implicit default team when it still has members and isn't a
    // registered tenant (the common case for a single-tenant install).
    if (!registry.some((t) => t.id === DEFAULT_TENANT)) {
      const defaultCount = counts.get(DEFAULT_TENANT) ?? 0;
      if (defaultCount > 0) {
        const synthetic: Tenant = {
          id: DEFAULT_TENANT,
          name: 'Default team',
          createdAt: '',
          status: 'active',
        };
        overview.unshift({ ...synthetic, memberCount: defaultCount });
      }
    }

    return overview;
  }

  /**
   * Set a tenant's status (super-admin; ADR-0038). The implicit default team has
   * no registry row and so cannot be suspended — a missing tenant is a 404.
   */
  async setStatus(id: string, status: TenantStatus): Promise<Tenant> {
    const tenant = await this.tenants.findById(id);
    if (!tenant) throw new NotFoundError(`Tenant ${id} not found`);
    if (tenant.status !== status) await this.tenants.setStatus(id, status);
    return { ...tenant, status };
  }
}
