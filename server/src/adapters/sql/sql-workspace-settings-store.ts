import { eq } from 'drizzle-orm';
import type { WorkspaceSettings } from '../../domain/workspace-settings.js';
import type { WorkspaceSettingsStore } from '../../ports/workspace-settings-store.js';
import type { Db } from './db.js';
import { workspaceSettings } from './schema.js';

/** Postgres-backed workspace settings (one row per owner scope). */
export class SqlWorkspaceSettingsStore implements WorkspaceSettingsStore {
  private readonly db: Db;

  constructor(deps: { db: Db }) {
    this.db = deps.db;
  }

  async get(ownerId: string): Promise<WorkspaceSettings | null> {
    const rows = await this.db
      .select()
      .from(workspaceSettings)
      .where(eq(workspaceSettings.ownerId, ownerId));
    return rows[0]?.settings ?? null;
  }

  async set(ownerId: string, settings: WorkspaceSettings): Promise<void> {
    await this.db
      .insert(workspaceSettings)
      .values({ ownerId, settings })
      .onConflictDoUpdate({ target: workspaceSettings.ownerId, set: { settings } });
  }
}
