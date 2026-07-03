/* Component tests for the shared loading/error placeholders (ADR-0023). Proves
   the render + interaction pattern: the module publishes its components with
   `Object.assign(window, …)`, the design-system stub (see setup.js) fakes
   `DST.Button`, and Testing Library renders into jsdom and drives a click.

   ErrorState/LoadingState are the smallest real components in the kit, so they
   make the exemplar the base is measured against. */
import { describe, it, expect, beforeAll, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

let LoadingState;
let ErrorState;

beforeAll(async () => {
  await import('../DataStates.jsx'); // side effect: Object.assign(window, { … })
  LoadingState = window.LoadingState;
  ErrorState = window.ErrorState;
});

describe('LoadingState', () => {
  it('Loading_NoLabel_RendersDefaultStatus', () => {
    render(<LoadingState />);
    const status = screen.getByRole('status');
    expect(status).toHaveTextContent('Loading…');
  });

  it('Loading_CustomLabel_RendersIt', () => {
    render(<LoadingState label="Loading talents…" />);
    expect(screen.getByRole('status')).toHaveTextContent('Loading talents…');
  });
});

describe('ErrorState', () => {
  it('Error_NoMessage_RendersDefaultAlert', () => {
    render(<ErrorState />);
    expect(screen.getByRole('alert')).toHaveTextContent("We couldn't load this data.");
  });

  it('Error_WithoutOnRetry_RendersNoRetryControl', () => {
    render(<ErrorState message="Nope." />);
    expect(screen.queryByText('Retry')).not.toBeInTheDocument();
  });

  it('Error_RetryClicked_InvokesOnRetry', async () => {
    const onRetry = vi.fn();
    render(<ErrorState onRetry={onRetry} />);

    await userEvent.click(screen.getByText('Retry'));

    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
