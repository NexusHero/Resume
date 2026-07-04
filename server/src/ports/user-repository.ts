import type { User, Role } from '../domain/user.js';
import type { LlmProviderId } from './llm-provider.js';

/** Persistence of registered accounts. */
export interface UserRepository {
  /** Every account — the team's members. */
  list(): Promise<User[]>;
  findByEmail(email: string): Promise<User | null>;
  findById(id: string): Promise<User | null>;
  add(user: User): Promise<void>;
  /** Replace an account's roles (admin member management). */
  updateRoles(id: string, roles: Role[]): Promise<void>;
  /** Stamp the account as email-verified (soft verification flow). */
  markVerified(id: string, at: string): Promise<void>;
  /** Persist the user's AI provider choice (Settings → AI models). */
  setLlmProvider(id: string, provider: LlmProviderId): Promise<void>;
  /** Delete an account by id; returns whether a row was removed (DSGVO erasure). */
  remove(id: string): Promise<boolean>;
}
