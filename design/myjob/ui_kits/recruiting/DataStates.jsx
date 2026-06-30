/* DataStates — shared loading and error placeholders for the live data views.
   The recruiting views show these instead of silently falling back to sample
   data, so a recruiter never sees fabricated records when the API is slow or
   unreachable. */
const DST = window.MyJobDesignSystem_f3658e;

function LoadingState({ label = 'Loading…' }) {
  return (
    <div role="status" style={{ padding: '56px 24px', textAlign: 'center', color: 'var(--text-soft)', fontSize: '13px' }}>
      {label}
    </div>
  );
}

function ErrorState({ message = "We couldn't load this data.", onRetry }) {
  return (
    <div role="alert" style={{ padding: '48px 24px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px' }}>
      <div style={{ fontSize: '13.5px', color: 'var(--text-soft)', maxWidth: '320px' }}>{message}</div>
      {onRetry && (
        <DST.Button size="sm" variant="outline" onClick={onRetry}>
          Retry
        </DST.Button>
      )}
    </div>
  );
}

Object.assign(window, { LoadingState, ErrorState });
