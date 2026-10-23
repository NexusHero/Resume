import { z } from 'zod';

/**
 * Per-workspace feature settings (ADR-0057). Today the only flag is
 * `vermittlung`: when off (the default), the intermediary features
 * (Suchaufträge, Pipeline, Platzierungen, Performance, Postfach, CoRecruiter)
 * are hidden in the UI and answer 404 on the API. Their data is untouched.
 */
export interface WorkspaceSettings {
  /** Recruiter functions (Suchaufträge, pipeline, placements, …) are reachable. Default off. */
  vermittlung: boolean;
}

/** A fresh workspace starts with the intermediary features switched off. */
export const DEFAULT_WORKSPACE_SETTINGS: WorkspaceSettings = { vermittlung: false };

/**
 * The 404 detail for a route that belongs to a switched-off feature. The UI
 * recognises it to refresh the workspace settings (another admin may have
 * flipped the switch).
 */
export const FEATURE_NOT_ENABLED_DETAIL = 'This feature is not enabled for this workspace.';

/** Merge a stored (possibly partial) settings object over the defaults. */
export function withDefaults(
  stored: Partial<WorkspaceSettings> | null | undefined,
): WorkspaceSettings {
  return { ...DEFAULT_WORKSPACE_SETTINGS, ...(stored ?? {}) };
}

/** PATCH /api/v1/settings/workspace — only a workspace admin may flip the switch. */
export const updateWorkspaceSettingsSchema = z
  .object({ vermittlung: z.boolean() })
  .partial()
  .strict()
  .refine((v) => Object.keys(v).length > 0, 'at least one setting is required');
export type UpdateWorkspaceSettingsInput = z.infer<typeof updateWorkspaceSettingsSchema>;
