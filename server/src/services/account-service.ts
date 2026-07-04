import type { UserRepository } from '../ports/user-repository.js';
import type { UserErasureStep, UserExportSection } from '../ports/personal-data.js';

export interface AccountServiceDeps {
  userRepository: UserRepository;
  userErasureSteps: UserErasureStep[];
  userExportSections: UserExportSection[];
}

/** The signed-in recruiter's DSGVO payload: their account plus the team workspace. */
export interface AccountExport {
  exportedAt: string; // the request's own timestamp, stamped by the caller
  /** One entry per registered export section (account, mandates, talents, …). */
  [section: string]: unknown;
}

/**
 * Account-level DSGVO operations. Recruiting records belong to the team, not the
 * individual, so:
 *  - export returns the caller's account plus the shared team workspace, and
 *  - erase removes only the person's own footprint (account, sessions, reset
 *    and verification tokens, personal API keys, usage) — the team's data stays
 *    so one member leaving can't wipe everyone's work.
 *
 * Neither list lives here: both are assembled from the personal-data registry
 * (`ports/personal-data.ts`) in the composition root, so a new personal-data
 * container is registered once rather than added to erase and export by hand.
 * The account row itself is the one exception — it is removed here, explicitly
 * last, because it is the identity every other footprint hangs off.
 */
export class AccountService {
  private readonly users: UserRepository;
  private readonly erasureSteps: UserErasureStep[];
  private readonly exportSections: UserExportSection[];

  constructor(deps: AccountServiceDeps) {
    this.users = deps.userRepository;
    this.erasureSteps = deps.userErasureSteps;
    this.exportSections = deps.userExportSections;
  }

  /** The caller's account plus the team workspace. `at` is the request time. */
  async exportFor(userId: string, teamScope: string, at: string): Promise<AccountExport> {
    const sections = await Promise.all(
      this.exportSections.map(
        async (section) => [section.key, await section.collect(userId, teamScope)] as const,
      ),
    );
    return { exportedAt: at, ...Object.fromEntries(sections) };
  }

  /**
   * Erase the person's own footprint: run every registered erasure step, then
   * remove the account row last. Idempotent — erasing an already-gone account
   * removes nothing. Shared team data is left untouched.
   */
  async erase(userId: string): Promise<void> {
    for (const step of this.erasureSteps) {
      await step.erase(userId);
    }
    await this.users.remove(userId);
  }
}
