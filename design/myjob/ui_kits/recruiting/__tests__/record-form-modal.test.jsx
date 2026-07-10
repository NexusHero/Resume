/* Regression tests for RecordFormModal: deleting a placement (Bug: placements
   couldn't be removed) and validating the fee field (Bug: any text was accepted
   as a fee). Real Button/Input/Textarea/Select are installed so a native submit
   button drives the form's onSubmit and text fields carry values. */
import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

let RecordFormModal;

function Button({ children, onClick, type, disabled }) {
  return (
    <button type={type || 'button'} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  );
}
function Input({ label, value, onChange, ...rest }) {
  return <input aria-label={rest['aria-label'] || label} value={value} onChange={onChange} />;
}
function Select({ label, options = [], value, onChange, ...rest }) {
  return (
    <select aria-label={rest['aria-label'] || label} value={value} onChange={onChange}>
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );
}
function Textarea({ label, value, onChange, ...rest }) {
  return <textarea aria-label={rest['aria-label'] || label} value={value} onChange={onChange} />;
}

beforeAll(async () => {
  globalThis.installDesignSystem({ Button, Input, Select, Textarea });
  await import('../use-viewport.jsx');
  await import('../RecordFormModal.jsx');
  RecordFormModal = window.RecordFormModal;
});

afterEach(() => {
  vi.restoreAllMocks();
});

const placement = {
  candidateName: 'Mara Vogel',
  candidateRole: 'Engineer',
  client: 'Aurora',
  start: '2026-01-01',
  fee: '19.000 €',
  status: 'probation',
};

describe('RecordFormModal — delete', () => {
  it('EditPlacement_DeleteClicked_DefersToOnDeleteAndCloses', async () => {
    // Delete is now reversible via the undo snackbar (#200): no blocking
    // window.confirm — the modal just calls onDelete (which schedules the
    // deferred delete + Undo toast) and closes.
    const onDelete = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();
    const confirmSpy = vi.spyOn(window, 'confirm');
    render(
      <RecordFormModal
        kind="placement"
        record={placement}
        onSubmit={vi.fn()}
        onDelete={onDelete}
        onClose={onClose}
      />,
    );

    await userEvent.click(screen.getByText('Delete'));

    expect(confirmSpy).not.toHaveBeenCalled(); // no system dialog
    expect(onDelete).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
    confirmSpy.mockRestore();
  });

  it('CreatePlacement_NoDelete_HidesDeleteButton', () => {
    render(<RecordFormModal kind="placement" onSubmit={vi.fn()} onClose={vi.fn()} />);
    expect(screen.queryByText('Delete')).not.toBeInTheDocument();
  });
});

describe('RecordFormModal — fee validation', () => {
  it('Placement_InvalidFee_BlocksSubmitAndShowsError', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(
      <RecordFormModal
        kind="placement"
        record={{ ...placement, fee: 'lots of money' }}
        onSubmit={onSubmit}
        onClose={vi.fn()}
      />,
    );

    await userEvent.click(screen.getByText('Save changes'));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent('Enter a valid amount for: Fee');
  });

  it('Placement_ValidFee_Submits', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(
      <RecordFormModal kind="placement" record={placement} onSubmit={onSubmit} onClose={vi.fn()} />,
    );

    await userEvent.click(screen.getByText('Save changes'));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit.mock.calls[0][0].fee).toBe('19.000 €');
  });
});
