import {
  HIDDEN_VERMITTLER_DATA_WARNING,
  logHiddenVermittlerData,
  runAssistantTick,
  runReplySyncTick,
} from '../../src/services/scheduler-ticks.js';
import { WorkspaceSettingsService } from '../../src/services/workspace-settings-service.js';
import {
  InMemoryMandateRepository,
  InMemoryPlacementRepository,
  InMemoryWorkspaceSettingsStore,
  noopLogger,
} from '../support/fakes.js';

const settingsFor = async (scopes: string[], vermittlung: boolean) => {
  const store = new InMemoryWorkspaceSettingsStore();
  for (const scope of scopes) await store.set(scope, { vermittlung });
  return new WorkspaceSettingsService({ workspaceSettingsStore: store });
};

describe('scheduler ticks', () => {
  it('AssistantTick_VermittlungOff_SkipsScope', async () => {
    const calls: string[] = [];
    await runAssistantTick({
      scopes: async () => ['team'],
      settings: await settingsFor(['team'], false),
      assistant: { runIfDue: async (s) => calls.push(s) },
      logger: noopLogger,
    });
    expect(calls).toEqual([]);
  });

  it('AssistantTick_VermittlungOn_RunsScope', async () => {
    const calls: string[] = [];
    await runAssistantTick({
      scopes: async () => ['team'],
      settings: await settingsFor(['team'], true),
      assistant: { runIfDue: async (s) => calls.push(s) },
      logger: noopLogger,
    });
    expect(calls).toEqual(['team']);
  });

  it('AssistantTick_OneScopeFails_OtherScopesStillRun', async () => {
    const calls: string[] = [];
    await runAssistantTick({
      scopes: async () => ['a', 'b'],
      settings: await settingsFor(['a', 'b'], true),
      assistant: {
        runIfDue: async (s) => {
          if (s === 'a') throw new Error('boom');
          calls.push(s);
        },
      },
      logger: noopLogger,
    });
    expect(calls).toEqual(['b']);
  });

  it('ReplySyncTick_VermittlungOff_SkipsScope', async () => {
    const calls: string[] = [];
    await runReplySyncTick({
      scopes: async () => ['team'],
      settings: await settingsFor(['team'], false),
      mail: { syncRepliesSafely: async (s) => calls.push(s) },
      logger: noopLogger,
    });
    expect(calls).toEqual([]);
  });

  it('ReplySyncTick_VermittlungOn_SyncsScope', async () => {
    const calls: string[] = [];
    await runReplySyncTick({
      scopes: async () => ['team'],
      settings: await settingsFor(['team'], true),
      mail: { syncRepliesSafely: async (s) => calls.push(s) },
      logger: noopLogger,
    });
    expect(calls).toEqual(['team']);
  });

  it('HiddenVermittlerDataCheck_SwitchOffAndMandatesPresent_LogsWarningWithCounts', async () => {
    const warnings: unknown[] = [];
    const logger = {
      ...noopLogger,
      warn: (ctx: unknown, msg?: string) => warnings.push([ctx, msg]),
    } as never;
    const mandates = new InMemoryMandateRepository();
    const placements = new InMemoryPlacementRepository();
    await mandates.add({
      id: 'm1',
      ownerId: 'team',
      client: 'A',
      role: 'R',
      location: 'L',
      createdAt: '2026-01-01T00:00:00.000Z',
    } as never);
    await logHiddenVermittlerData({
      scopes: async () => ['team'],
      settings: await settingsFor(['team'], false),
      mandates,
      placements,
      logger,
    });
    expect(warnings[0]).toEqual([
      { scope: 'team', mandates: 1, placements: 0 },
      HIDDEN_VERMITTLER_DATA_WARNING,
    ]);
  });

  it('HiddenVermittlerDataCheck_SwitchOnOrNoData_LogsNothing', async () => {
    const warnings: unknown[] = [];
    const logger = {
      ...noopLogger,
      warn: (ctx: unknown, msg?: string) => warnings.push([ctx, msg]),
    } as never;
    await logHiddenVermittlerData({
      scopes: async () => ['team'],
      settings: await settingsFor(['team'], true),
      mandates: new InMemoryMandateRepository(),
      placements: new InMemoryPlacementRepository(),
      logger,
    });
    await logHiddenVermittlerData({
      scopes: async () => ['other'],
      settings: await settingsFor(['other'], false),
      mandates: new InMemoryMandateRepository(),
      placements: new InMemoryPlacementRepository(),
      logger,
    });
    expect(warnings).toEqual([]);
  });
});
