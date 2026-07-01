import { type UserView, toUserView } from '../domain/user';
import type { Mandate } from '../domain/mandate';
import type { Talent } from '../domain/talent';
import type { Placement } from '../domain/placement';
import type { UserRepository } from '../ports/user-repository';
import type { MandateRepository } from '../ports/mandate-repository';
import type { TalentRepository } from '../ports/talent-repository';
import type { PlacementRepository } from '../ports/placement-repository';
import type { ApiKeyStore } from '../ports/api-key-store';
import type { SessionStore } from '../ports/session-store';
import type { PasswordResetTokenStore } from '../ports/password-reset-token-store';

export interface AccountServiceDeps {
  userRepository: UserRepository;
  mandateRepository: MandateRepository;
  talentRepository: TalentRepository;
  placementRepository: PlacementRepository;
  apiKeyStore: ApiKeyStore;
  sessionStore: SessionStore;
  passwordResetTokenStore: PasswordResetTokenStore;
}

/** The signed-in recruiter's DSGVO payload: their account plus the team workspace. */
export interface AccountExport {
  exportedAt: string; // the request's own timestamp, stamped by the caller
  account: UserView | null;
  mandates: Mandate[];
  talents: Talent[];
  placements: Placement[];
}

/**
 * Account-level DSGVO operations. Recruiting records belong to the team, not the
 * individual, so:
 *  - export returns the caller's account plus the shared team workspace, and
 *  - erase removes only the person's own footprint (account, sessions, reset
 *    tokens, personal API keys) — the team's data stays so one member leaving
 *    can't wipe everyone's work.
 */
export class AccountService {
  private readonly users: UserRepository;
  private readonly mandates: MandateRepository;
  private readonly talents: TalentRepository;
  private readonly placements: PlacementRepository;
  private readonly keys: ApiKeyStore;
  private readonly sessions: SessionStore;
  private readonly resetTokens: PasswordResetTokenStore;

  constructor(deps: AccountServiceDeps) {
    this.users = deps.userRepository;
    this.mandates = deps.mandateRepository;
    this.talents = deps.talentRepository;
    this.placements = deps.placementRepository;
    this.keys = deps.apiKeyStore;
    this.sessions = deps.sessionStore;
    this.resetTokens = deps.passwordResetTokenStore;
  }

  /** The caller's account plus the team workspace. `at` is the request time. */
  async exportFor(userId: string, teamScope: string, at: string): Promise<AccountExport> {
    const [user, mandates, talents, placements] = await Promise.all([
      this.users.findById(userId),
      this.mandates.list(teamScope),
      this.talents.list(teamScope),
      this.placements.list(teamScope),
    ]);
    return {
      exportedAt: at,
      account: user ? toUserView(user) : null,
      mandates,
      talents,
      placements,
    };
  }

  /**
   * Erase the person's own footprint: their personal API keys, every session and
   * outstanding reset token, then the account itself. Shared team data is left
   * untouched. Idempotent — erasing an already-gone account removes nothing.
   */
  async erase(userId: string): Promise<void> {
    for (const provider of await this.keys.providersFor(userId)) {
      await this.keys.remove(userId, provider);
    }
    await this.sessions.destroyForUser(userId);
    await this.resetTokens.destroyForUser(userId);
    await this.users.remove(userId);
  }
}
