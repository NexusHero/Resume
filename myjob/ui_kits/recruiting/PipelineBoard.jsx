/* __kit_guard__ */
(function(){ var __s=document.currentScript; if (__s && /_ds_bundle\.js/.test(__s.src||'')) return;
/* PipelineBoard — Kanban columns by pipeline stage. */
const { Icon: PIcon, Avatar: PAvatar, Badge: PBadge, STAGES } = window.BewerbungstoolDesignSystem_a75119;

function KanbanCard({ c, onOpen }) {
  const [hover, setHover] = React.useState(false);
  return (
    <div
      onClick={() => onOpen(c.id)}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background: 'var(--surface-card)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius-md)', padding: '12px 13px', cursor: 'pointer',
        boxShadow: hover ? 'var(--shadow-md)' : 'var(--shadow-xs)',
        transform: hover ? 'translateY(-2px)' : 'none',
        transition: 'box-shadow var(--dur-fast), transform var(--dur-fast)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
        <PAvatar name={c.name} src={c.src} size="sm" />
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '13px', fontWeight: 700, color: 'var(--text-heading)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name}</div>
          <div style={{ fontSize: '11.5px', color: 'var(--text-soft)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.role}</div>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '7px', fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '10px' }}>
        <PIcon name="briefcase" size={12} style={{ color: 'var(--text-soft)' }} />
        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.position}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <PBadge variant="subtle" size="sm" icon={<PIcon name="tag" size={10} />}>{c.source}</PBadge>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', fontWeight: 600, color: c.score >= 80 ? 'var(--success)' : 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>{c.score}%</span>
      </div>
    </div>
  );
}

function PipelineBoard({ candidates, onOpen }) {
  const order = window.STAGES_ORDER;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${order.length}, minmax(220px, 1fr))`, gap: '14px', alignItems: 'start', height: '100%' }}>
      {order.map((stage) => {
        const list = candidates.filter((c) => c.status === stage);
        const meta = STAGES[stage];
        return (
          <div key={stage} style={{ display: 'flex', flexDirection: 'column', gap: '11px', minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 2px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: meta.color }} />
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>{meta.label}</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', fontWeight: 600, color: 'var(--text-soft)', background: 'var(--surface-sunk)', borderRadius: 'var(--radius-pill)', padding: '1px 8px', marginLeft: 'auto' }}>{list.length}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', background: 'var(--surface-app)', borderRadius: 'var(--radius-md)' }}>
              {list.map((c) => <KanbanCard key={c.id} c={c} onOpen={onOpen} />)}
              {list.length === 0 && (
                <div style={{ border: '1.5px dashed var(--border-strong)', borderRadius: 'var(--radius-md)', padding: '18px', textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-soft)' }}>leer</div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

Object.assign(window, { PipelineBoard });

})();
