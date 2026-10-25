/* Bewerbungen — the application list (ADR-0059). Cards carry the Mandant, the
   company + title (from the snapshots, so a deleted posting still renders), a
   status badge, and delete-with-undo. Clicking opens the Bewerbungs-Editor.
   There is no sample data — empty/error states are handled by the caller. */
const BW = window.MyJobDesignSystem_5611b7;

const STATUS_META = {
  draft: { label: 'Draft', color: 'var(--text-soft)' },
  sent: { label: 'Sent', color: 'var(--accent-strong)' },
  interview: { label: 'Interview', color: 'var(--warning-strong, #8a6d00)' },
  offer: { label: 'Offer', color: 'var(--positive, #1F8A5B)' },
  rejected: { label: 'Rejected', color: 'var(--danger)' },
};

const STATUS_FILTERS = [
  { value: undefined, label: 'All' },
  { value: 'draft', label: 'Draft' },
  { value: 'sent', label: 'Sent' },
  { value: 'interview', label: 'Interview' },
  { value: 'offer', label: 'Offer' },
  { value: 'rejected', label: 'Rejected' },
];

function Bewerbungen({ applications = [], onOpen, onChanged, status, onStatusChange }) {
  const [query, setQuery] = React.useState('');
  const [hiddenIds, setHiddenIds] = React.useState(() => new Set());

  const visible = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = applications.filter((a) => !hiddenIds.has(a.id));
    if (!q) return filtered;
    return filtered.filter((a) =>
      [a.talentName, a.postingCompany, a.postingTitle].some((f) =>
        String(f || '')
          .toLowerCase()
          .includes(q),
      ),
    );
  }, [applications, query, hiddenIds]);

  const unhide = (id) =>
    setHiddenIds((s) => {
      const n = new Set(s);
      n.delete(id);
      return n;
    });

  const remove = (app) => {
    setHiddenIds((s) => new Set(s).add(app.id));
    window.UndoDelete.schedule({
      label: `Application${app.postingCompany ? ` at ${app.postingCompany}` : ''} removed`,
      commit: () =>
        window.RecruitApi.deleteJobApplication(app.id)
          .then(() => onChanged && onChanged())
          .catch(() => onChanged && onChanged())
          .finally(() => unhide(app.id)),
      restore: () => {
        unhide(app.id);
        if (onChanged) onChanged();
      },
    });
  };

  const fallbackMeta = STATUS_META.draft;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div style={{ display: 'flex', gap: '4px', background: 'var(--surface-sunk)', borderRadius: 'var(--radius-md)', padding: '4px', alignSelf: 'flex-start', flexWrap: 'wrap' }}>
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.label}
            data-testid={`status-filter-${f.label}`}
            aria-pressed={status === f.value}
            onClick={() => onStatusChange && onStatusChange(f.value)}
            style={{
              border: 'none',
              cursor: 'pointer',
              borderRadius: 'var(--radius-sm)',
              fontFamily: 'var(--font-mono)',
              fontSize: '12px',
              fontWeight: 600,
              padding: '5px 12px',
              minHeight: '32px',
              background: status === f.value ? 'var(--surface-card)' : 'transparent',
              color: status === f.value ? 'var(--text-heading)' : 'var(--text-soft)',
              boxShadow: status === f.value ? 'var(--shadow-xs)' : 'none',
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--surface-card)', border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-md)', padding: '0 12px', flex: 1, minWidth: 0 }}>
        <BW.Icon name="search" size={15} style={{ color: 'var(--text-soft)' }} />
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search applications …" aria-label="Search applications" style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--text-heading)', padding: '10px 0' }} />
      </label>

      {visible.length === 0 ? (
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-soft)', border: '1px dashed var(--border-strong)', borderRadius: 'var(--radius-lg)' }}>
          {applications.length === 0 ? 'No applications yet.' : 'No matches.'}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
          {visible.map((a) => {
            const meta = STATUS_META[a.status] || fallbackMeta;
            return (
              <BW.Card key={a.id} style={{ cursor: 'pointer' }} onClick={() => onOpen && onOpen(a)}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px' }}>
                  <div>
                    <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '16px', fontWeight: 700, color: 'var(--text-heading)', margin: 0, letterSpacing: '-0.01em' }}>{a.postingTitle}</h3>
                    <div style={{ fontSize: '12.5px', color: 'var(--text-muted)', marginTop: '3px' }}>{a.postingCompany}</div>
                  </div>
                  <BW.IconButton icon="trash" label="Delete" aria-label="Delete" variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); remove(a); }} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', margin: '14px 0 0' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-soft)' }}>for {a.talentName}</span>
                  <span style={{ display: 'inline-block', fontFamily: 'var(--font-mono)', fontSize: '10px', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: meta.color, background: 'var(--surface-sunk)', border: '1px solid var(--border)', borderRadius: 'var(--radius-pill)', padding: '3px 9px' }}>
                    {meta.label}
                  </span>
                </div>
              </BW.Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

Object.assign(window, { Bewerbungen });
