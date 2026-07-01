import { type UserView, toUserView } from '../domain/user';
import type { Mandate } from '../domain/mandate';
import type { Talent } from '../domain/talent';
import type { Placement } from '../domain/placement';
import type { UserRepository } from '../ports/user-repository';
import type { MandateRepository } from '../ports/mandate-repository';
import type { TalentRepository } from '../ports/talent-repository';
import type { PlacementRepository } from '../ports/placement-repository';
import type { DocumentRepository } from '../ports/document-repository';
import type { AttachmentStore } from '../ports/attachment-store';
import type { CandidacyRepository } from '../ports/candidacy-repository';
import type { SessionStore } from '../ports/session-store';
import type { PasswordResetTokenStore } from '../ports/password-reset-token-store';

export interface AccountServiceDeps {
  userRepository: UserRepository;
  mandateRepository: MandateRepository;
  talentRepository: TalentRepository;
  placementRepository: PlacementRepository;
  documentRepository: DocumentRepository;
  attachmentStore: AttachmentStore;
  candidacyRepository: CandidacyRepository;
  sessionStore: SessionStore;
  passwordResetTokenStore: PasswordResetTokenStore;
}

/** Everything the signed-in recruiter owns — the DSGVO data-portability payload. */
export interface AccountExport {
  exportedAt: string; // the request's own timestamp, stamped by the caller
  account: UserView | null;
  mandates: Mandate[];
  talents: Talent[];
  placements: Placement[];
}

/**
 * Account-level DSGVO operations: export everything a recruiter owns
 * (Auskunft/Datenportabilität) and erase it entirely (Recht auf Löschung).
 */
export class AccountService {
  private readonly users: UserRepository;
  private readonly mandates: MandateRepository;
  private readonly talents: TalentRepository;
  private readonly placements: PlacementRepository;
  private readonly documents: DocumentRepository;
  private readonly attachments: AttachmentStore;
  private readonly candidacies: CandidacyRepository;
  private readonly sessions: SessionStore;
  private readonly resetTokens: PasswordResetTokenStore;

  constructor(deps: AccountServiceDeps) {
    this.users = deps.userRepository;
    this.mandates = deps.mandateRepository;
    this.talents = deps.talentRepository;
    this.placements = deps.placementRepository;
    this.documents = deps.documentRepository;
    this.attachments = deps.attachmentStore;
    this.candidacies = deps.candidacyRepository;
    this.sessions = deps.sessionStore;
    this.resetTokens = deps.passwordResetTokenStore;
  }

  /** Gather every owner-scoped record plus the account profile. `at` is the request time. */
  async exportFor(ownerId: string, at: string): Promise<AccountExport> {
    const [user, mandates, talents, placements] = await Promise.all([
      this.users.findById(ownerId),
      this.mandates.list(ownerId),
      this.talents.list(ownerId),
      this.placements.list(ownerId),
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
   * Erase the account and all data it owns: recruiting records first, then every
   * session and outstanding password-reset token for the user, then the account
   * itself. Idempotent — erasing an already-gone account simply removes nothing.
   */
  async erase(ownerId: string): Promise<void> {
    await this.removeAll(this.mandates, ownerId, await this.mandates.list(ownerId));
    await this.removeAll(this.talents, ownerId, await this.talents.list(ownerId));
    await this.removeAll(this.placements, ownerId, await this.placements.list(ownerId));
    await this.documents.removeForOwner(ownerId);
    await this.attachments.removeForOwner(ownerId);
    await this.candidacies.removeForOwner(ownerId);
    await this.sessions.destroyForUser(ownerId);
    await this.resetTokens.destroyForUser(ownerId);
    await this.users.remove(ownerId);
  }

  private async removeAll(
    repo: { remove(ownerId: string, id: string): Promise<boolean> },
    ownerId: string,
    rows: { id: string }[],
  ): Promise<void> {
    for (const row of rows) await repo.remove(ownerId, row.id);
  }
}
