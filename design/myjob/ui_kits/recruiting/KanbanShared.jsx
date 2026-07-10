/* KanbanShared — one column + card implementation for every board in the kit
   (#199). Two boards used to speak different dialects for "a card in a column":
   the Applications board (PipelineBoard) and the Mandate pipeline
   (MandatePipeline). They now share these primitives, so drag feedback, the
   stage `<select>`, the remove button (icon + placement) and click-to-open are
   IDENTICAL on both. Domain differences (talent avatar + score vs. note) stay
   as the card's `children`. */
const KS = window.MyJobDesignSystem_f3658e;

/* A stage column: a header (colour dot + label + count), a drag-over highlight,
   a drop target, and the shared empty / "drop here" placeholder. The board owns
   the drag state and passes the handlers; this is pure presentation. */
function KanbanColumn({
  color,
  label,
  count,
  over = false,
  canDrop = true,
  onDragOver,
  onDragLeave,
  onDrop,
  isEmpty = false,
  snap = false,
  children,
}) {
  return (
    <div
      onDragOver={canDrop ? onDragOver : undefined}
      onDragLeave={canDrop ? onDragLeave : undefined}
      onDrop={canDrop ? onDrop : undefined}
      // On a phone the board is a horizontal snap-scroller; each column snaps to
      // the viewport start (.board-col-snap, index.html) (#202).
      className={snap ? 'board-col-snap' : undefined}
      style={{
        display: 'flex', flexDirection: 'column', gap: '11px', minWidth: 0,
        borderRadius: 'var(--radius-md)', outline: over ? '2px dashed var(--accent)' : 'none',
        outlineOffset: '3px', background: over ? 'var(--accent-soft)' : 'transparent',
        transition: 'background var(--dur-fast)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 2px' }}>
        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: color }} />
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>{label}</span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', fontWeight: 600, color: 'var(--text-soft)', background: 'var(--surface-sunk)', borderRadius: 'var(--radius-pill)', padding: '1px 8px', marginLeft: 'auto' }}>{count}</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', minHeight: '52px' }}>
        {children}
        {isEmpty && (
          <div style={{ border: '1.5px dashed var(--border-strong)', borderRadius: 'var(--radius-md)', padding: '16px', textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-soft)' }}>
            {over ? 'drop here' : 'empty'}
          </div>
        )}
      </div>
    </div>
  );
}

/* A draggable card shell with a consistent footer. `children` is the domain
   body (clickable → onOpen). The footer, when the board is editable, is always
   the same anatomy: a Stage `<select>` (aria-label "Stage") followed by a remove
   button (trash icon, same placement) — so the two boards are indistinguishable
   as interaction models. */
function KanbanCard({
  dragId,
  canDrag = true,
  onOpen,
  openLabel,
  stages,
  stageValue,
  onStageChange,
  onRemove,
  removeLabel = 'Remove',
  children,
}) {
  const [hover, setHover] = React.useState(false);
  const [dragging, setDragging] = React.useState(false);
  const { isMobile } = window.useViewport ? window.useViewport() : { isMobile: false };
  const hasStage = stages && typeof onStageChange === 'function';
  const hasFooter = hasStage || typeof onRemove === 'function';
  return (
    <div
      draggable={canDrag}
      onDragStart={canDrag ? (e) => {
        e.dataTransfer.setData('text/plain', dragId);
        e.dataTransfer.effectAllowed = 'move';
        setDragging(true);
      } : undefined}
      onDragEnd={canDrag ? () => setDragging(false) : undefined}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      title={canDrag ? 'Drag to another stage' : undefined}
      style={{
        background: 'var(--surface-card)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius-md)', padding: '12px 13px',
        boxShadow: hover ? 'var(--shadow-md)' : 'var(--shadow-xs)',
        transition: 'box-shadow var(--dur-fast), transform var(--dur-fast)',
        cursor: canDrag ? 'grab' : 'default', opacity: dragging ? 0.45 : 1,
      }}
    >
      {/* The card body opens the record — keyboard-operable, not just clickable
          (#203): a button role, in tab order, Enter/Space activates. Drag stays
          a pointer-only enhancement. */}
      <div
        onClick={onOpen ? () => onOpen() : undefined}
        onKeyDown={onOpen ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(); } } : undefined}
        role={onOpen ? 'button' : undefined}
        tabIndex={onOpen ? 0 : undefined}
        aria-label={onOpen ? openLabel : undefined}
        style={{ cursor: onOpen ? 'pointer' : 'default', borderRadius: 'var(--radius-sm)' }}
      >
        {children}
      </div>
      {hasFooter && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '11px' }}>
          {hasStage && (
            <select
              aria-label="Stage"
              value={stageValue}
              onChange={(e) => onStageChange(e.target.value)}
              // ≥44px tall on touch so the stage change is a comfortable tap and
              // the drag-fallback (#202) is reliable; compact on the desktop board.
              style={{ flex: 1, minWidth: 0, padding: isMobile ? '10px 10px' : '5px 8px', minHeight: isMobile ? '44px' : undefined, borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-strong)', background: 'var(--surface-sunk)', color: 'var(--text-soft)', fontFamily: 'var(--font-mono)', fontSize: isMobile ? '13px' : '11px', cursor: 'pointer', outline: 'none' }}
            >
              {stages.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          )}
          {typeof onRemove === 'function' && (
            <button
              onClick={onRemove}
              title={removeLabel}
              aria-label={removeLabel}
              // 44×44 tap target on touch (spacing, not just the 14px glyph) (#202).
              style={{ flexShrink: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: isMobile ? '0' : '4px', width: isMobile ? '44px' : undefined, height: isMobile ? '44px' : undefined, lineHeight: 0 }}
            >
              <KS.Icon name="trash" size={14} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

Object.assign(window, { KanbanColumn, KanbanCard });
