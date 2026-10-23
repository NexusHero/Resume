import type { Logger } from '../ports/logger.js';
import type { MandateRepository } from '../ports/mandate-repository.js';
import type { PlacementRepository } from '../ports/placement-repository.js';
import type { WorkspaceSettingsService } from './workspace-settings-service.js';

/** Workspaces the timers iterate, loaded fresh each tick. */
export type ScopeLoader = () => Promise<string[]>;

export interface SchedulerTickDeps {
  scopes: ScopeLoader;
  settings: WorkspaceSettingsService;
  logger: Logger;
}

export interface AssistantTickDeps extends SchedulerTickDeps {
  assistant: { runIfDue(scope: string): Promise<unknown> };
}

export interface ReplySyncTickDeps extends SchedulerTickDeps {
  mail: { syncRepliesSafely(scope: string): Promise<void> };
}

export interface HiddenDataDeps extends SchedulerTickDeps {
  mandates: Pick<MandateRepository, 'list'>;
  placements: Pick<PlacementRepository, 'list'>;
}

/** The warning text required by the plan (§4.1). */
export const HIDDEN_VERMITTLER_DATA_WARNING =
  'Vermittlung is off for this workspace but it holds recruiter data; enable it under Settings, Workspace.';

const errMessage = (err: unknown): string => (err instanceof Error ? err.message : String(err));

/** Assistant tick: only workspaces with Vermittlung on; failures are isolated. */
export async function runAssistantTick(deps: AssistantTickDeps): Promise<void> {
  const enabled = await deps.settings.filterVermittlungEnabled(await deps.scopes());
  for (const scope of enabled) {
    try {
      await deps.assistant.runIfDue(scope);
    } catch (err) {
      deps.logger.warn({ scope, err: errMessage(err) }, 'assistant scheduled run failed');
    }
  }
}

/** Reply-sync tick: same workspace filter as the assistant. */
export async function runReplySyncTick(deps: ReplySyncTickDeps): Promise<void> {
  const enabled = await deps.settings.filterVermittlungEnabled(await deps.scopes());
  for (const scope of enabled) {
    try {
      await deps.mail.syncRepliesSafely(scope);
    } catch (err) {
      deps.logger.warn({ scope, err: errMessage(err) }, 'scheduled reply sync failed');
    }
  }
}

/** Boot warning (owner decision Q1): one per workspace whose recruiter data is hidden. */
export async function logHiddenVermittlerData(deps: HiddenDataDeps): Promise<void> {
  for (const scope of await deps.scopes()) {
    if (await deps.settings.isVermittlungEnabled(scope)) continue;
    const mandates = (await deps.mandates.list(scope)).length;
    const placements = (await deps.placements.list(scope)).length;
    if (mandates > 0 || placements > 0) {
      deps.logger.warn({ scope, mandates, placements }, HIDDEN_VERMITTLER_DATA_WARNING);
    }
  }
}
