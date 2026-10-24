/* Bewerbungen — the application list (ADR-0059). Cards carry the Mandant, the
   company + title (from the snapshots, so a deleted posting still renders), a
   status badge, and delete-with-undo. Clicking opens the Bewerbungs-Editor.
   There is no sample data — empty/error states are handled by the caller. */
const BW = window.MyJobDesignSystem_5611b7;

const STATUS_META = {
  draft: { label: 'Entwurf', color: 'var(--text-soft)' },
  sent: { label: 'Versendet', color: 'var(--accent-strong)' },
  interview: { label: 'Gespräch', color: 'var(--warning-strong, #8a6d00)' },
  offer: { label: 'Zusage', color: 'var(--positive, #1F8A5B)' },
  rejected: { label: 'Absage', color: 'var(--danger)' },
};

function Bewerbungen({ applications = [], onOpen, onChanged }) {
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
      label: `Bewerbung${app.postingCompany ? ` bei ${app.postingCompany}` : ''} entfernt`,
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

  const status = STATUS_META.draft;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--surface-card)', border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-md)', padding: '0 12px', flex: 1, minWidth: 0 }}>
        <BW.Icon name="search" size={15} style={{ color: 'var(--text-soft)' }} />
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Bewerbungen durchsuchen …" aria-label="Bewerbungen durchsuchen" style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--text-heading)', padding: '10px 0' }} />
      </label>

      {visible.length === 0 ? (
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-soft)', border: '1px dashed var(--border-strong)', borderRadius: 'var(--radius-lg)' }}>
          {applications.length === 0 ? 'Noch keine Bewerbungen.' : 'Keine Treffer.'}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
          {visible.map((a) => {
            const meta = STATUS_META[a.status] || status;
            return (
              <BW.Card key={a.id} style={{ cursor: 'pointer' }} onClick={() => onOpen && onOpen(a)}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px' }}>
                  <div>
                    <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '16px', fontWeight: 700, color: 'var(--text-heading)', margin: 0, letterSpacing: '-0.01em' }}>{a.postingTitle}</h3>
                    <div style={{ fontSize: '12.5px', color: 'var(--text-muted)', marginTop: '3px' }}>{a.postingCompany}</div>
                  </div>
                  <BW.IconButton icon="trash" label="Löschen" aria-label="Löschen" variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); remove(a); }} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', margin: '14px 0 0' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-soft)' }}>für {a.talentName}</span>
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
