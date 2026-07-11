/* Component tests for the pipeline board (ADR-0024 split). MandateCard and
   PipelineColumns are pure presentation — the orchestrator owns state — so they
   test cleanly against props. This is the net that A2's split relies on, since
   the e2e layer does not drive the pipeline board. */
import { describe, it, expect, beforeAll, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

let MandateCard;
let PipelineColumns;

beforeAll(async () => {
  await import('../KanbanShared.jsx'); // window.KanbanColumn/KanbanCard (#199)
  await import('../MandatePipeline.jsx'); // side effect: Object.assign(window, { … })
  MandateCard = window.MandateCard;
  PipelineColumns = window.PipelineColumns;
});

const card = (over = {}) => ({
  id: 'c1',
  stage: 'screening',
  talent: { id: 't1', name: 'Ada Lovelace', role: 'Staff Engineer' },
  ...over,
});

describe('MandateCard', () => {
  it('Card_WithTalent_ShowsNameAndRole', () => {
    render(<MandateCard card={card()} onOpenTalent={vi.fn()} onMove={vi.fn()} onRemove={vi.fn()} />);
    expect(screen.getByText('Ada Lovelace')).toBeInTheDocument();
    expect(screen.getByText('Staff Engineer')).toBeInTheDocument();
  });

  it('Card_NameClicked_OpensTalentProfile', async () => {
    const onOpenTalent = vi.fn();
    render(<MandateCard card={card()} onOpenTalent={onOpenTalent} onMove={vi.fn()} onRemove={vi.fn()} />);
    await userEvent.click(screen.getByText('Ada Lovelace'));
    expect(onOpenTalent).toHaveBeenCalledWith('t1');
  });

  it('Card_RemoveClicked_InvokesOnRemoveWithCard', async () => {
    const onRemove = vi.fn();
    const c = card();
    render(<MandateCard card={c} onOpenTalent={vi.fn()} onMove={vi.fn()} onRemove={onRemove} />);
    await userEvent.click(screen.getByTitle('Remove from pipeline'));
    expect(onRemove).toHaveBeenCalledWith(c);
  });

  it('Card_StageSelected_InvokesOnMoveWithNewStage', async () => {
    const onMove = vi.fn();
    const c = card();
    render(<MandateCard card={c} onOpenTalent={vi.fn()} onMove={onMove} onRemove={vi.fn()} />);
    await userEvent.selectOptions(screen.getByRole('combobox'), 'offer');
    expect(onMove).toHaveBeenCalledWith(c, 'offer');
  });

  it('Card_NoTalent_ShowsUnknownAndDoesNotOpen', async () => {
    const onOpenTalent = vi.fn();
    render(<MandateCard card={card({ talent: null })} onOpenTalent={onOpenTalent} onMove={vi.fn()} onRemove={vi.fn()} />);
    await userEvent.click(screen.getByText('Unknown talent'));
    expect(onOpenTalent).not.toHaveBeenCalled();
  });
});

describe('PipelineColumns', () => {
  const props = (over = {}) => ({
    cards: [
      { id: 'c1', stage: 'screening', talent: { id: 't1', name: 'Ada Lovelace', role: 'Eng' } },
      { id: 'c2', stage: 'screening', talent: { id: 't2', name: 'Bo Nguyen', role: 'PM' } },
      { id: 'c3', stage: 'offer', talent: { id: 't3', name: 'Cy Park', role: 'SRE' } },
    ],
    dropStage: null,
    setDropStage: vi.fn(),
    onDrop: vi.fn(),
    onOpenTalent: vi.fn(),
    onMove: vi.fn(),
    onRemove: vi.fn(),
    ...over,
  });

  it('Columns_AllStages_RenderAsHeaders', () => {
    // Empty board: each stage label appears once (the column header). With cards
    // present, every MandateCard's stage <select> repeats the labels as options.
    render(<PipelineColumns {...props({ cards: [] })} />);
    for (const label of ['Sourced', 'Screening', 'Interview', 'Offer', 'Placed', 'Rejected']) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });

  it('Columns_Cards_LandInTheirStageColumn', () => {
    render(<PipelineColumns {...props()} />);
    // Two cards in screening, one in offer.
    expect(screen.getByText('Ada Lovelace')).toBeInTheDocument();
    expect(screen.getByText('Bo Nguyen')).toBeInTheDocument();
    expect(screen.getByText('Cy Park')).toBeInTheDocument();
  });

  it('Columns_EmptyStage_ShowsEmptyPlaceholder', () => {
    render(<PipelineColumns {...props({ cards: [] })} />);
    // Every one of the six columns is empty.
    expect(screen.getAllByText('leer')).toHaveLength(6);
  });

  it('Columns_HoveredDropTarget_ShowsDropHint', () => {
    render(<PipelineColumns {...props({ cards: [], dropStage: 'interview' })} />);
    expect(screen.getByText('hierhin ziehen')).toBeInTheDocument();
    expect(screen.getAllByText('leer')).toHaveLength(5);
  });
});
