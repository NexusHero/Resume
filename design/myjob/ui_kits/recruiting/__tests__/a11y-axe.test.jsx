/* Automated accessibility guard (#203): axe-core runs over the real, mounted
   surfaces and fails on any serious/critical violation. Unlike the other kit
   tests this loads the REAL design-system bundle (not the passthrough stub) so
   the checked DOM is what actually ships — labels, roles, contrast-independent
   structure. Covers Login and the Applications board from the acceptance list
   plus the dialog and snackbar the #200/#203 work introduced. */
import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import axe from 'axe-core';

async function axeClean(container) {
  const results = await axe.run(container, {
    resultTypes: ['violations'],
    // Colour-contrast is enforced separately by the token guard (#198) and needs
    // real layout metrics jsdom doesn't provide; everything else is in scope.
    rules: { 'color-contrast': { enabled: false }, region: { enabled: false } },
  });
  return results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
}

function report(violations) {
  return violations.map((v) => `  [${v.impact}] ${v.id}: ${v.help} (${v.nodes.length} node/s)`).join('\n');
}

beforeAll(async () => {
  await import('../../../_ds_bundle.js'); // real window.MyJobDesignSystem_f3658e
  await import('../data.js');
  await import('../use-viewport.jsx');
  await import('../use-dialog.jsx');
  await import('../undo-delete.js');
  await import('../use-undo-delete.jsx');
  await import('../Snackbar.jsx');
  await import('../ConfirmDialog.jsx');
  await import('../KanbanShared.jsx');
  await import('../PipelineBoard.jsx');
  await import('../DataStates.jsx');
  await import('../Matching.jsx');
  await import('../Login.jsx');
});

beforeEach(() => {
  window.RecruitApi = {
    authProviders: () => Promise.resolve({ google: false, linkedin: false }),
    login: () => Promise.resolve({}),
    searchJobs: () => Promise.resolve([]),
  };
  window.UndoDelete && window.UndoDelete.reset();
});

const apps = [
  { id: 'a1', company: 'Aurora Systems', role: 'C++ Engineer', talentId: 't1', talentName: 'Mara Vogel', status: 'new', score: 88 },
  { id: 'a2', company: 'Helio GmbH', role: 'Backend Engineer', talentId: 't2', talentName: 'Ada Lovelace', status: 'review', score: 72 },
];

describe('Accessibility — axe has no serious/critical violations (#203)', () => {
  it('Login_HasNoSeriousOrCriticalViolations', async () => {
    const { container } = render(
      <window.LoginScreen providers={{ google: false, linkedin: false }} onAuthed={() => {}} initialNotice={null} />,
    );
    const v = await axeClean(container);
    expect(v, `Login axe violations:\n${report(v)}`).toEqual([]);
  });

  it('ApplicationsBoard_HasNoSeriousOrCriticalViolations', async () => {
    const { container } = render(
      <window.PipelineBoard apps={apps} talents={[]} onOpen={() => {}} onMove={() => {}} onDelete={() => {}} />,
    );
    const v = await axeClean(container);
    expect(v, `Applications board axe violations:\n${report(v)}`).toEqual([]);
  });

  it('ConfirmDialog_HasNoSeriousOrCriticalViolations', async () => {
    const { container } = render(
      <window.ConfirmDialog title="Anonymize Ada?" message="This cannot be undone." confirmLabel="Anonymize" onConfirm={() => {}} onCancel={() => {}} />,
    );
    const v = await axeClean(container);
    expect(v, `ConfirmDialog axe violations:\n${report(v)}`).toEqual([]);
  });

  it('Matching_HasNoSeriousOrCriticalViolations', async () => {
    const talents = [
      { id: 't1', name: 'Mara Vogel', role: 'C++ Engineer', skills: ['C++', 'CMake', 'Linux'], me: true },
      { id: 't2', name: 'Ada Lovelace', role: 'Backend Engineer', skills: ['Go', 'gRPC'] },
    ];
    const { container } = render(
      <window.Matching talents={talents} mandates={[]} onCreateMandate={() => {}} onApply={() => {}} />,
    );
    const v = await axeClean(container);
    expect(v, `Matching axe violations:\n${report(v)}`).toEqual([]);
  });

  it('UndoSnackbar_HasNoSeriousOrCriticalViolations', async () => {
    window.UndoDelete.schedule({ label: 'Application removed', commit: () => {}, restore: () => {} });
    const { container } = render(<window.Snackbar />);
    const v = await axeClean(container);
    expect(v, `Snackbar axe violations:\n${report(v)}`).toEqual([]);
  });
});
