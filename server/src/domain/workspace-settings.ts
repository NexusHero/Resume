import { z } from 'zod';

/**
 * Per-workspace feature settings (ADR-0057). Today the only flag is
 * `vermittlung`: when off (the default), the agency/intermediary features
 * (Suchaufträge, Pipeline, Platzierungen, Performance, Postfach, CoRecruiter)
 * are hidden in the UI and answer 404 on the API. Their data is untouched.
 */
export interface WorkspaceSettings {
  vermittlung: boolean;
}

/** A fresh workspace starts with the intermediary features switched off. */
export const DEFAULT_WORKSPACE_SETTINGS: WorkspaceSettings = { vermittlung: false };

/** PATCH /api/v1/settings/workspace — only a workspace admin may flip the switch. */
export const updateWorkspaceSettingsSchema = z.object({
  vermittlung: z.boolean(),
});
export type UpdateWorkspaceSettingsInput = z.infer<typeof updateWorkspaceSettingsSchema>;
