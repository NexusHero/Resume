/**
 * DSGVO personal-data lifecycle registry (composition-root pattern).
 *
 * Account erase and export used to hand-list every store they had to touch. That
 * is how an entire container once slipped through: `AccountService.erase` never
 * cleared the email-verification tokens, so they (and the tenant invites hanging
 * off them) survived a "delete my account". A hand-maintained list gives the
 * compiler no way to notice a forgotten container.
 *
 * Instead, each data-owning container registers its own contribution **once**, in
 * the composition root (`container.ts`). `AccountService` only iterates the
 * registry, so wiring up a new personal-data container is a one-line
 * registration next to all the others — not an edit threaded through erase and
 * export separately.
 */

/** One container's contribution to erasing a user's own footprint (DSGVO Art. 17). */
export interface UserErasureStep {
  /** Stable name for logging/audit, e.g. 'sessions', 'email-verification-tokens'. */
  readonly label: string;
  /** Remove everything this container holds for the user. Must be idempotent. */
  erase(userId: string): Promise<void>;
}

/** One container's contribution to a user's data export (DSGVO Art. 15/20). */
export interface UserExportSection {
  /** The key this section occupies in the export payload, e.g. 'mandates'. */
  readonly key: string;
  /** Collect the user's (and their team scope's) data held by this container. */
  collect(userId: string, scope: string): Promise<unknown>;
}
