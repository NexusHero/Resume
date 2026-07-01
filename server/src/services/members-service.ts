import { type UserView, type Role, toUserView, isAdmin } from '../domain/user';
import { NotFoundError, ValidationError } from '../domain/errors';
import type { UserRepository } from '../ports/user-repository';

export interface MembersServiceDeps {
  userRepository: UserRepository;
}

/**
 * Team membership: list the accounts on the instance and change their roles.
 * Enforces the one domain invariant that outlives any UI — the team can never
 * be left without an admin (you can't lock everyone out).
 */
export class MembersService {
  private readonly users: UserRepository;

  constructor(deps: MembersServiceDeps) {
    this.users = deps.userRepository;
  }

  /** All members, oldest first, as public views (no secrets). */
  async list(): Promise<UserView[]> {
    const users = await this.users.list();
    return users
      .slice()
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
      .map(toUserView);
  }

  /** Set a member's roles, refusing to demote the last remaining admin. */
  async setRoles(targetId: string, roles: Role[]): Promise<UserView> {
    const target = await this.users.findById(targetId);
    if (!target) throw new NotFoundError(`Member ${targetId} not found`);

    const losingAdmin = isAdmin(target) && !roles.includes('admin');
    if (losingAdmin) {
      const admins = (await this.users.list()).filter(isAdmin);
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
