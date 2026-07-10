/* PipelineBoard — Kanban of BEWERBUNGEN (applications) by stage. Cards move
   between stages by drag-and-drop or the per-card stage dropdown (both persist
   via the applications PATCH), and a card can be removed. Mirrors the mandate
   pipeline's interaction; the orchestrator (app.jsx) owns the move/delete. */
const PB = window.MyJobDesignSystem_f3658e;

function KanbanCard({ app, talent, order, onOpen, onMove, onDelete }) {
  const [hover, setHover] = React.useState(false);
  const [dragging, setDragging] = React.useState(false);
  const canEdit = typeof onMove === 'function';
  return (
    <div
      draggable={canEdit}
      onDragStart={(e) => {
        e.dataTransfer.setData('text/plain', app.id);
        e.dataTransfer.effectAllowed = 'move';
        setDragging(true);
      }}
      onDragEnd={() => setDragging(false)}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      title={canEdit ? 'Drag to another stage' : undefined}
      style={{
        background: 'var(--surface-card)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius-md)', padding: '12px 13px',
        boxShadow: hover ? 'var(--shadow-md)' : 'var(--shadow-xs)',
        transition: 'box-shadow var(--dur-fast), transform var(--dur-fast)',
        cursor: canEdit ? 'grab' : 'default', opacity: dragging ? 0.45 : 1,
      }}
    >
      {/* clickable summary — opens the candidate's profile */}
      <div onClick={() => onOpen(talent.id)} style={{ cursor: 'pointer' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '9px' }}>
          <PB.Icon name="building" size={14} style={{ color: 'var(--text-soft)' }} />
          <span style={{ fontFamily: 'var(--font-display)', fontSize: '13.5px', fontWeight: 700, color: 'var(--text-heading)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{app.company}</span>
        </div>
        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '11px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{app.role}</div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '7px', minWidth: 0 }}>
            <PB.Avatar name={talent.name} src={talent.src} size="xs" />
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-soft)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{talent.me ? 'Me' : (talent.name || '').split(' ')[0] || 'Candidate'}</span>
          </div>
          {typeof app.score === 'number' && (
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', fontWeight: 600, color: app.score >= 80 ? 'var(--success)' : 'var(--text-muted)' }}>{app.score}%</span>
          )}
        </div>
      </div>

      {/* stage control + remove — only when the board is editable */}
      {canEdit && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '11px' }}>
          <select
            aria-label="Stage"
            value={app.status}
            onChange={(e) => onMove(app.id, e.target.value)}
            style={{ flex: 1, minWidth: 0, padding: '5px 8px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-strong)', background: 'var(--surface-sunk)', color: 'var(--text-soft)', fontFamily: 'var(--font-mono)', fontSize: '11px', cursor: 'pointer', outline: 'none' }}
          >
            {order.map((s) => <option key={s} value={s}>{window.STAGE_LABELS[s]}</option>)}
          </select>
          <button
            onClick={() => onDelete(app.id, app.company)}
            title="Remove application"
            aria-label="Remove application"
            style={{ flexShrink: 0, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '4px', lineHeight: 0 }}
          >
            <PB.Icon name="trash" size={14} />
          </button>
        </div>
      )}
    </div>
  );
}

function PipelineBoard({ apps, talents, onOpen, onMove, onDelete }) {
  const order = window.STAGES_ORDER;
  const [dropStage, setDropStage] = React.useState(null);
  const byId = Object.fromEntries(talents.map((t) => [t.id, t]));
  // An application filed for a candidate who is no longer in the pool (or the
  // pinned "me") still renders — fall back to the name captured on the record.
  const talentFor = (a) => byId[a.talentId] || { id: a.talentId, name: a.talentName || 'Candidate', me: false };
  const canEdit = typeof onMove === 'function';
  const drop = (e, stage) => {
    e.preventDefault();
    setDropStage(null);
    const id = e.dataTransfer.getData('text/plain');
    const app = apps.find((a) => a.id === id);
    if (app && app.status !== stage) onMove(id, stage);
  };
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${order.length}, minmax(210px, 1fr))`, gap: '14px', alignItems: 'start', height: '100%' }}>
      {order.map((stage) => {
        const list = apps.filter((a) => a.status === stage);
        const meta = PB.STAGES[stage];
        const over = dropStage === stage;
        return (
          <div
            key={stage}
            onDragOver={canEdit ? (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setDropStage(stage); } : undefined}
            onDragLeave={canEdit ? (e) => { if (!e.currentTarget.contains(e.relatedTarget)) setDropStage(null); } : undefined}
            onDrop={canEdit ? (e) => drop(e, stage) : undefined}
            style={{ display: 'flex', flexDirection: 'column', gap: '11px', minWidth: 0, borderRadius: 'var(--radius-md)', outline: over ? '2px dashed var(--accent)' : 'none', outlineOffset: '3px', background: over ? 'var(--accent-soft)' : 'transparent', transition: 'background var(--dur-fast)' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 2px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: meta.color }} />
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>{window.STAGE_LABELS[stage]}</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', fontWeight: 600, color: 'var(--text-soft)', background: 'var(--surface-sunk)', borderRadius: 'var(--radius-pill)', padding: '1px 8px', marginLeft: 'auto' }}>{list.length}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {list.map((a) => <KanbanCard key={a.id} app={a} talent={talentFor(a)} order={order} onOpen={onOpen} onMove={onMove} onDelete={onDelete} />)}
              {list.length === 0 && (
                <div style={{ border: '1.5px dashed var(--border-strong)', borderRadius: 'var(--radius-md)', padding: '16px', textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-soft)' }}>{over ? 'drop here' : 'empty'}</div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

Object.assign(window, { PipelineBoard });
