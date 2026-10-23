import type { WorkspaceSettings } from '../domain/workspace-settings.js';

/**
 * Persistence of per-workspace feature settings (ADR-0057), keyed by the owner
 * scope (the tenant id, or `DEFAULT_TENANT`). A missing row means the defaults
 * apply (`vermittlung: false`) — so a fresh workspace is "application first".
 */
export interface WorkspaceSettingsStore {
  get(ownerId: string): Promise<WorkspaceSettings | null>;
  set(ownerId: string, settings: WorkspaceSettings): Promise<void>;
}
