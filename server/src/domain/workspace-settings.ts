import { z } from 'zod';

/**
 * Per-workspace feature settings (ADR-0057). `vermittlung` hides the recruiter
 * features (Suchaufträge, Pipeline, Platzierungen, Performance, Postfach,
 * CoRecruiter) in the UI and answers 404 on the API; their data is untouched.
 */
export interface WorkspaceSettings {
  /** Recruiter functions are reachable. Default off. */
  vermittlung: boolean;
  /**
   * The workspace operator has confirmed (ADR-0063) that CV and ad text may be
   * sent to the configured AI provider. Default off; absent counts as "not
   * granted". Set once via `PATCH /settings/workspace` (admin only).
   */
  aiConsent: boolean;
  /**
   * Whether the legacy pipeline `Application` records were migrated into the new
   * `JobApplication`/`JobPosting` entities (AK-2.7). Set once by the boot
   * migration; absent counts as "not yet migrated".
   */
  applicationsMigrated?: boolean;
}

/** A fresh workspace starts application-first. */
export const DEFAULT_WORKSPACE_SETTINGS: WorkspaceSettings = {
  vermittlung: false,
  aiConsent: false,
};

/**
 * 404 detail for a switched-off feature. The UI recognises it to refresh the
 * workspace settings (another admin may have flipped the switch).
 */
export const FEATURE_NOT_ENABLED_DETAIL = 'This feature is not enabled for this workspace.';

/**
 * English detail for a missing AI consent (ADR-0063). Shown in the consent dialog
 * and echoed verbatim by the 403 `ai-consent-required` problem+json, so the UI
 * can recognise it and re-open the consent flow.
 */
export const AI_CONSENT_REQUIRED_DETAIL =
  'AI processing has not been approved for this workspace yet.';

/** Merge a stored (possibly partial) settings object over the defaults. */
export function withDefaults(
  stored: Partial<WorkspaceSettings> | null | undefined,
): WorkspaceSettings {
  return { ...DEFAULT_WORKSPACE_SETTINGS, ...(stored ?? {}) };
}

/** PATCH /api/v1/settings/workspace — workspace admins only. */
export const updateWorkspaceSettingsSchema = z
  .object({ vermittlung: z.boolean(), aiConsent: z.boolean() })
  .partial()
  .strict()
  .refine((v) => Object.keys(v).length > 0, 'at least one setting is required');
export type UpdateWorkspaceSettingsInput = z.infer<typeof updateWorkspaceSettingsSchema>;
