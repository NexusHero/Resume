import {
  DEFAULT_WORKSPACE_SETTINGS,
  type UpdateWorkspaceSettingsInput,
  type WorkspaceSettings,
  withDefaults,
} from '../domain/workspace-settings.js';
import type { WorkspaceSettingsStore } from '../ports/workspace-settings-store.js';

export interface WorkspaceSettingsServiceDeps {
  workspaceSettingsStore: WorkspaceSettingsStore;
}

/**
 * Per-workspace feature settings (ADR-0057). A workspace with no stored row
 * gets the defaults (`vermittlung: false`), so a fresh workspace is
 * "application first". The store is keyed by the workspace scope, which also
 * covers the implicit `DEFAULT_TENANT`.
 */
export class WorkspaceSettingsService {
  private readonly store: WorkspaceSettingsStore;

  constructor(deps: WorkspaceSettingsServiceDeps) {
    this.store = deps.workspaceSettingsStore;
  }

  async get(scope: string): Promise<WorkspaceSettings> {
    return withDefaults(await this.store.get(scope));
  }

  async update(scope: string, patch: UpdateWorkspaceSettingsInput): Promise<WorkspaceSettings> {
    const current = await this.get(scope);
    const next: WorkspaceSettings = { ...DEFAULT_WORKSPACE_SETTINGS, ...current, ...patch };
    await this.store.set(scope, next);
    return next;
  }

  /** Kept for the existing call sites; equivalent to updating one field. */
  async setVermittlung(scope: string, vermittlung: boolean): Promise<WorkspaceSettings> {
    return this.update(scope, { vermittlung });
  }

  async isVermittlungEnabled(scope: string): Promise<boolean> {
    return (await this.get(scope)).vermittlung;
  }

  /** The subset of `scopes` whose workspace has the intermediary features on. */
  async filterVermittlungEnabled(scopes: string[]): Promise<string[]> {
    const enabled: string[] = [];
    for (const scope of scopes) {
      if (await this.isVermittlungEnabled(scope)) enabled.push(scope);
    }
    return enabled;
  }
}
