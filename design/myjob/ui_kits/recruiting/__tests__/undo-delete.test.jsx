/* Undo-delete controller + snackbar (#200): the deferred-delete contract that
   replaces window.confirm. Undo restores and sends NO delete; a timeout sends
   exactly one; scheduling a second delete flushes the first; a manual flush
   (navigation / unload) commits; and the snackbar is an accessible role="status"
   with a keyboard-focusable Undo action. */
import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

let UndoDelete;

beforeAll(async () => {
  await import('../undo-delete.js'); // window.UndoDelete
  await import('../use-undo-delete.jsx'); // window.useUndoDelete
  await import('../Snackbar.jsx'); // window.Snackbar
  UndoDelete = window.UndoDelete;
});

beforeEach(() => UndoDelete.reset());

describe('UndoDelete controller', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('Undo_BeforeTimeout_RestoresAndSendsNoDelete', () => {
    const commit = vi.fn();
    const restore = vi.fn();
    UndoDelete.schedule({ label: 'Application removed', commit, restore });
    expect(UndoDelete.getPending().label).toBe('Application removed');

    UndoDelete.undo();

    expect(restore).toHaveBeenCalledTimes(1);
    expect(commit).not.toHaveBeenCalled();
    expect(UndoDelete.getPending()).toBeNull();
    // the cancelled timer must not still fire a delete later
    vi.advanceTimersByTime(UndoDelete.DELAY_MS + 100);
    expect(commit).not.toHaveBeenCalled();
  });

  it('Timeout_FiresExactlyOneDelete', () => {
    const commit = vi.fn();
    const restore = vi.fn();
    UndoDelete.schedule({ label: 'x', commit, restore });

    vi.advanceTimersByTime(UndoDelete.DELAY_MS);

    expect(commit).toHaveBeenCalledTimes(1);
    expect(restore).not.toHaveBeenCalled();
    expect(UndoDelete.getPending()).toBeNull();
    // no second fire
    vi.advanceTimersByTime(UndoDelete.DELAY_MS);
    expect(commit).toHaveBeenCalledTimes(1);
  });

  it('SchedulingASecondDelete_FlushesTheFirst', () => {
    const commitA = vi.fn();
    const commitB = vi.fn();
    UndoDelete.schedule({ label: 'A', commit: commitA, restore: vi.fn() });
    UndoDelete.schedule({ label: 'B', commit: commitB, restore: vi.fn() });

    expect(commitA).toHaveBeenCalledTimes(1); // the first committed immediately
    expect(commitB).not.toHaveBeenCalled();
    expect(UndoDelete.getPending().label).toBe('B');
  });

  it('Flush_CommitsThePendingDeleteNow', () => {
    const commit = vi.fn();
    UndoDelete.schedule({ label: 'x', commit, restore: vi.fn() });

    UndoDelete.flush(); // e.g. navigation / beforeunload

    expect(commit).toHaveBeenCalledTimes(1);
    expect(UndoDelete.getPending()).toBeNull();
  });
});

describe('Snackbar', () => {
  it('Pending_RendersAccessibleStatusWithKeyboardFocusableUndo', async () => {
    const user = userEvent.setup();
    const restore = vi.fn();
    const commit = vi.fn();
    render(<window.Snackbar />);
    // nothing shown until a delete is scheduled
    expect(screen.queryByRole('status')).toBeNull();

    UndoDelete.schedule({ label: 'Placement removed', commit, restore });

    const bar = await screen.findByRole('status');
    expect(bar).toHaveTextContent('Placement removed');
    const undoBtn = screen.getByRole('button', { name: 'Rückgängig' });
    // keyboard-reachable: it's a real button and can hold focus
    undoBtn.focus();
    expect(undoBtn).toHaveFocus();

    await user.click(undoBtn);

    expect(restore).toHaveBeenCalledTimes(1);
    expect(commit).not.toHaveBeenCalled();
    expect(screen.queryByRole('status')).toBeNull();
  });
});
