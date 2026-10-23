import type { WorkspaceSettings } from '../domain/workspace-settings.js';
import { withDefaults } from '../domain/workspace-settings.js';

/**
 * Persistence of per-workspace feature settings (ADR-0057), keyed by the
 * workspace scope (the tenant id, or `DEFAULT_TENANT`). A missing row means the
 * defaults apply (`vermittlung: false`) — so a fresh workspace is
 * "application first".
 */
export interface WorkspaceSettingsStore {
  get(workspaceId: string): Promise<WorkspaceSettings | null>;
  set(workspaceId: string, settings: WorkspaceSettings): Promise<void>;
}

/** Merge stored (possibly partial) settings over the defaults. */
export function normalizeStoredSettings(stored: WorkspaceSettings | null): WorkspaceSettings {
  return withDefaults(stored);
}
