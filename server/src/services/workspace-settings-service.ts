import {
  DEFAULT_WORKSPACE_SETTINGS,
  type WorkspaceSettings,
} from '../domain/workspace-settings.js';
import type { WorkspaceSettingsStore } from '../ports/workspace-settings-store.js';

export interface WorkspaceSettingsServiceDeps {
  workspaceSettingsStore: WorkspaceSettingsStore;
}

/**
 * Per-workspace feature settings (ADR-0057). A workspace with no stored row
 * gets the defaults (`vermittlung: false`), so a fresh workspace is
 * "application first". The store is keyed by the owner scope, which also covers
 * the implicit `DEFAULT_TENANT`.
 */
export class WorkspaceSettingsService {
  private readonly store: WorkspaceSettingsStore;

  constructor(deps: WorkspaceSettingsServiceDeps) {
    this.store = deps.workspaceSettingsStore;
  }

  async get(scope: string): Promise<WorkspaceSettings> {
    return (await this.store.get(scope)) ?? { ...DEFAULT_WORKSPACE_SETTINGS };
  }

  async setVermittlung(scope: string, vermittlung: boolean): Promise<WorkspaceSettings> {
    const current = await this.get(scope);
    const next: WorkspaceSettings = { ...current, vermittlung };
    await this.store.set(scope, next);
    return next;
  }
}
