/* Regression test for PipelineBoard: applications now come from the live API and
   may reference a candidate who isn't in the pool (or the pinned "me"). The board
   must still render them, falling back to the name captured on the record — the
   Applications page was previously always empty. */
import { describe, it, expect, beforeAll, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

let PipelineBoard;

beforeAll(async () => {
  // PB.STAGES is read for each column's colour dot; PipelineBoard captures the
  // design-system object at import time, so install the override FIRST.
  globalThis.installDesignSystem({
    STAGES: {
      new: { color: '#999' },
      review: { color: '#999' },
      interview: { color: '#999' },
      offer: { color: '#999' },
      hired: { color: '#999' },
    },
  });
  await import('../data.js'); // publishes window.STAGES_ORDER / STAGE_LABELS
  await import('../KanbanShared.jsx'); // window.KanbanColumn/KanbanCard (#199)
  await import('../PipelineBoard.jsx');
  PipelineBoard = window.PipelineBoard;
});

describe('PipelineBoard', () => {
  it('Application_TalentNotInPool_RendersWithCapturedName', () => {
    const apps = [
      { id: 'a1', company: 'Aurora Systems', role: 'C++ Engineer', talentId: 't1', talentName: 'Mara Vogel', status: 'new', score: null },
    ];
    render(<PipelineBoard apps={apps} talents={[]} onOpen={() => {}} />);
    expect(screen.getByText('Aurora Systems')).toBeInTheDocument();
    expect(screen.getByText('C++ Engineer')).toBeInTheDocument();
    expect(screen.getByText('Mara')).toBeInTheDocument(); // first name fallback
  });

  it('EmptyApps_RendersEmptyColumns', () => {
    render(<PipelineBoard apps={[]} talents={[]} onOpen={() => {}} />);
    expect(screen.getAllByText('empty').length).toBeGreaterThan(0);
  });

  it('ReadOnly_NoHandlers_HidesStageControlAndDelete', () => {
    const apps = [{ id: 'a1', company: 'Aurora', role: 'Eng', talentId: 't1', talentName: 'Mara', status: 'new', score: null }];
    render(<PipelineBoard apps={apps} talents={[]} onOpen={() => {}} />);
    expect(screen.queryByLabelText('Stage')).toBeNull();
    expect(screen.queryByLabelText('Remove application')).toBeNull();
  });

  it('StageDropdown_Change_MovesTheApplication', () => {
    const onMove = vi.fn();
    const apps = [{ id: 'a1', company: 'Aurora', role: 'Eng', talentId: 't1', talentName: 'Mara', status: 'new', score: null }];
    render(<PipelineBoard apps={apps} talents={[]} onOpen={() => {}} onMove={onMove} onDelete={() => {}} />);
    fireEvent.change(screen.getByLabelText('Stage'), { target: { value: 'interview' } });
    expect(onMove).toHaveBeenCalledWith('a1', 'interview');
  });

  it('RemoveButton_Click_DeletesTheApplication', () => {
    const onDelete = vi.fn();
    const apps = [{ id: 'a1', company: 'Aurora', role: 'Eng', talentId: 't1', talentName: 'Mara', status: 'new', score: null }];
    render(<PipelineBoard apps={apps} talents={[]} onOpen={() => {}} onMove={() => {}} onDelete={onDelete} />);
    fireEvent.click(screen.getByLabelText('Remove application'));
    expect(onDelete).toHaveBeenCalledWith('a1', 'Aurora');
  });
});
