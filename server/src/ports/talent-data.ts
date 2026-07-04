/**
 * DSGVO talent-data purge registry (composition-root pattern, sibling to
 * `ports/personal-data.ts`).
 *
 * A candidate's satellite data (documents, raw CV attachments, pipeline
 * candidacies) is cleared in two different ways, and those two lists used to be
 * maintained by hand in two different services:
 *  - **erase** — a hard delete (`TalentService.remove`): everything the talent
 *    owns goes with them.
 *  - **anonymize** — a soft DSGVO strip (`RetentionService.anonymize`): identifying
 *    data is removed but non-identifying pipeline history is kept for stats.
 *
 * Keeping those as two divergent method bodies is exactly how they drifted (erase
 * deleted candidacies, anonymize silently kept them, with no single place saying
 * so on purpose). Each talent-data container now registers **one** purger that
 * handles both modes, once, in the composition root. The erase/anonymize
 * difference is then explicit per container (e.g. the candidacy purger's
 * `anonymize` branch is a documented no-op) instead of implicit across two files.
 */

/** Which DSGVO purge is running: a hard delete, or a soft anonymization. */
export type TalentPurgeMode = 'erase' | 'anonymize';

/** One container's contribution to purging a talent's satellite data. */
export interface TalentDataPurger {
  /** Stable name for logging/audit, e.g. 'documents', 'attachments', 'candidacies'. */
  readonly label: string;
  /** Clear what this container holds for the talent, per mode. Must be idempotent. */
  purge(scope: string, talentId: string, mode: TalentPurgeMode): Promise<void>;
}
