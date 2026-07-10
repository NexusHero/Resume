/* Guards the unification (#199): the Applications board and the Mandate pipeline
   must present the SAME interaction model for "a card in a column". Rather than
   compare pixels, we assert both cards expose the identical anatomy — a
   draggable shell, a Stage <select> (aria-label "Stage") and a remove button
   labelled "Remove …" — so a user who works both boards learns one model. */
import { describe, it, expect, beforeAll, vi } from 'vitest';
import { render, within } from '@testing-library/react';

let ApplicationCard;
let MandateCard;

beforeAll(async () => {
  globalThis.installDesignSystem({
    STAGES: {
      new: { color: '#999' }, review: { color: '#999' }, interview: { color: '#999' },
      offer: { color: '#999' }, hired: { color: '#999' },
    },
  });
  await import('../data.js'); // window.STAGES_ORDER / STAGE_LABELS
  await import('../KanbanShared.jsx');
  await import('../PipelineBoard.jsx'); // window.ApplicationCard
  await import('../MandatePipeline.jsx'); // window.MandateCard
  ApplicationCard = window.ApplicationCard;
  MandateCard = window.MandateCard;
});

describe('Kanban — shared card anatomy (#199)', () => {
  it('BothBoards_Cards_ExposeTheSameDragStageAndRemoveAnatomy', () => {
    const appStages = window.STAGES_ORDER.map((s) => ({ value: s, label: window.STAGE_LABELS[s] }));
    const { container: applicationCard } = render(
      <ApplicationCard
        app={{ id: 'a1', company: 'Aurora', role: 'Engineer', status: 'new', score: 88 }}
        talent={{ id: 't1', name: 'Mara Vogel' }}
        stages={appStages}
        onOpen={vi.fn()}
        onMove={vi.fn()}
        onDelete={vi.fn()}
      />,
    );
    const { container: mandateCard } = render(
      <MandateCard
        card={{ id: 'c1', stage: 'screening', talent: { id: 't2', name: 'Ada Lovelace', role: 'Staff Engineer' } }}
        onOpenTalent={vi.fn()}
        onMove={vi.fn()}
        onRemove={vi.fn()}
      />,
    );

    for (const card of [applicationCard, mandateCard]) {
      // same draggable shell
      expect(card.querySelector('[draggable="true"]')).not.toBeNull();
      // same Stage control, same accessible name
      expect(within(card).getByLabelText('Stage').tagName).toBe('SELECT');
      // same remove affordance — one button, label starts with "Remove"
      const removeButtons = within(card)
        .getAllByRole('button')
        .filter((b) => /^Remove/.test(b.getAttribute('aria-label') || ''));
      expect(removeButtons).toHaveLength(1);
    }
  });
});
