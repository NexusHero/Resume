import type { User, Role } from '../domain/user';

/** Persistence of registered accounts. */
export interface UserRepository {
  /** Every account — the team's members. */
  list(): Promise<User[]>;
  findByEmail(email: string): Promise<User | null>;
  findById(id: string): Promise<User | null>;
  add(user: User): Promise<void>;
  /** Replace an account's password hash (used by the password-reset flow). */
  updatePassword(id: string, passwordHash: string): Promise<void>;
  /** Replace an account's roles (admin member management). */
  updateRoles(id: string, roles: Role[]): Promise<void>;
  /** Delete an account by id; returns whether a row was removed (DSGVO erasure). */
  remove(id: string): Promise<boolean>;
}
