import {
  type UserView,
  type Role,
  type User,
  DEFAULT_TENANT,
  toUserView,
  isAdmin,
} from '../domain/user.js';
import { NotFoundError, ValidationError } from '../domain/errors.js';
import type { UserRepository } from '../ports/user-repository.js';

export interface MembersServiceDeps {
  userRepository: UserRepository;
}

/** The tenant a user belongs to; absent means the default single tenant (ADR-0033). */
const tenantOf = (u: Pick<User, 'tenantId'>): string => u.tenantId ?? DEFAULT_TENANT;

/**
 * Team membership: list the accounts on the instance and change their roles.
 * Scoped by tenant (ADR-0033) — an admin only ever sees and manages members of
 * their own tenant, so different tenants never touch each other's accounts.
 * Enforces the one domain invariant that outlives any UI — a tenant can never
 * be left without an admin (you can't lock everyone out).
 */
export class MembersService {
  private readonly users: UserRepository;

  constructor(deps: MembersServiceDeps) {
    this.users = deps.userRepository;
  }

  /** The members of `scope`, oldest first, as public views (no secrets). */
  async list(scope: string = DEFAULT_TENANT): Promise<UserView[]> {
    const users = await this.users.list();
    return users
      .filter((u) => tenantOf(u) === scope)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
      .map(toUserView);
  }

  /**
   * Set a member's roles within `scope`, refusing to demote the tenant's last
   * remaining admin. A target outside `scope` is treated as not found, so an
   * admin can neither see nor mutate another tenant's accounts.
   */
  async setRoles(
    targetId: string,
    roles: Role[],
    scope: string = DEFAULT_TENANT,
  ): Promise<UserView> {
    const target = await this.users.findById(targetId);
    if (!target || tenantOf(target) !== scope) {
      throw new NotFoundError(`Member ${targetId} not found`);
    }

    const losingAdmin = isAdmin(target) && !roles.includes('admin');
    if (losingAdmin) {
      const admins = (await this.users.list()).filter((u) => tenantOf(u) === scope && isAdmin(u));
      if (admins.length <= 1) {
        throw new ValidationError('The team must keep at least one admin');
      }
    }

    // De-duplicate while preserving order.
    const unique = [...new Set(roles)];
    await this.users.updateRoles(targetId, unique);
    return toUserView({ ...target, roles: unique });
  }
}
