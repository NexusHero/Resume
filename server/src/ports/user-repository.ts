import type { User } from '../domain/user';

/** Persistence of registered accounts. */
export interface UserRepository {
  findByEmail(email: string): Promise<User | null>;
  findById(id: string): Promise<User | null>;
  add(user: User): Promise<void>;
  /** Replace an account's password hash (used by the password-reset flow). */
  updatePassword(id: string, passwordHash: string): Promise<void>;
  /** Delete an account by id; returns whether a row was removed (DSGVO erasure). */
  remove(id: string): Promise<boolean>;
}
