/* AK-2.8 — the ApplyModal is fully removed: no window symbol, no remaining
   reference in the orchestrator. */
import { describe, it, expect, beforeAll } from 'vitest';

beforeAll(async () => {
  await import('../use-viewport.jsx');
  await import('../data.js');
  await import('../workspace-settings.js');
  await import('../use-workspace-settings.jsx');
  await import('../Workspace.jsx');
  await import('../app.jsx');
});

describe('ApplyModal removal (AK-2.8)', () => {
  it('Window_ApplyModal_IsUndefined', () => {
    expect(window.ApplyModal).toBeUndefined();
  });
});
