/* EditorShared — small primitives shared by the editor workbench and its
   bolt-on tools (import/ATS/pitch/outreach modals, translate control): the mono
   pill button, the modal backdrop+panel pair, and the AI honesty banners
   (grounding warning + provider badge). */
const ESH = window.MyJobDesignSystem_f3658e;

/* The editor's pill button recipe: mono 11px text inside a border-strong
   radius-pill outline, optional leading icon. `style` merges last so callers
   can override single properties (e.g. the translate pills' weight/padding). */
function PillButton({ icon, children, onClick, disabled, title, style }) {
  const { isMobile } = window.useViewport ? window.useViewport() : { isMobile: false };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      // ≥44px tall on touch so each editor tool is a comfortable tap (#202).
      style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'none', border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-pill)', cursor: disabled ? 'default' : 'pointer', fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-soft)', padding: isMobile ? '10px 14px' : '4px 12px', minHeight: isMobile ? '44px' : undefined, ...style }}
    >
      {icon && <ESH.Icon name={icon} size={13} />} {children}
    </button>
  );
}

/* Modal backdrop + centered panel used by every editor modal. `scroll` adds the
   max-height/overflow pair (the import modal is the one that never scrolls);
   `subtitleGap` keeps the outreach modal's slightly larger 14px gap intact. */
function ModalShell({ title, subtitle, onClose, width, scroll = true, subtitleGap = '12px', children }) {
  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(8,11,18,0.45)', backdropFilter: 'blur(2px)', zIndex: 60 }} />
      <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 61, width: width || 'min(680px, 92vw)', ...(scroll ? { maxHeight: '88vh', overflowY: 'auto' } : {}), background: 'var(--surface-card)', borderRadius: 'var(--radius-xl)', boxShadow: 'var(--shadow-lg)', padding: '22px' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: '17px', fontWeight: 700, color: 'var(--text-heading)', marginBottom: '4px' }}>{title}</div>
        {subtitle && <div style={{ fontSize: '12.5px', color: 'var(--text-soft)', marginBottom: subtitleGap }}>{subtitle}</div>}
        {children}
      </div>
    </>
  );
}

/**
 * Grounding self-check banner. The server flags factual claims in an AI draft
 * that the candidate's CV + the mandate do not support (a fabricated skill, an
 * inflated "12 Jahre Erfahrung"). We surface those so the recruiter verifies
 * before sending — trust over speed.
 */
function GroundingWarning({ grounding }) {
  if (!grounding || grounding.grounded || !grounding.unsupported?.length) return null;
  const label = (u) => (u.kind === 'number' ? `Number “${u.text}”` : `Skill “${u.text}”`);
  const n = grounding.unsupported.length;
  return (
    <div style={{ marginTop: '14px', border: '1px solid var(--warning-border, #e6b800)', background: 'var(--warning-soft, rgba(230,184,0,0.10))', borderRadius: 'var(--radius-md)', padding: '11px 13px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '7px', fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 600, color: 'var(--warning-strong, #8a6d00)', marginBottom: '6px' }}>
        <ESH.Icon name="alert" size={12} />{n} {n === 1 ? 'unsupported claim' : 'unsupported claims'}
      </div>
      <div style={{ fontSize: '12.5px', lineHeight: 1.5, color: 'var(--text-body)' }}>
        These claims are not backed by the CV / mandate — please verify before sending:{' '}
        {grounding.unsupported.map((u) => label(u)).join(', ')}.
      </div>
    </div>
  );
}

/* Token/cost formatting for the per-call usage payload the AI endpoints
   return. Costs are estimates from list prices; most single calls land well
   under a cent, so small values keep four decimals instead of rounding to $0. */
function formatCallTokens(n) {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
}
function formatCallCost(v) {
  if (!v) return '$0.00';
  return v < 0.01 ? `$${v.toFixed(4)}` : `$${v.toFixed(2)}`;
}

/**
 * Which backend produced a generated draft — honesty over polish: recruiters
 * should always see whether AI or the deterministic template wrote the text.
 * When the response carries its per-call usage, the badge also shows what the
 * generation cost (tokens + estimated USD) right where the result appears.
 */
function ProviderBadge({ provider, usage }) {
  if (!provider) return null;
  const label = provider === 'template' ? 'Template · no AI' : `AI · ${provider}`;
  const spend = usage
    ? ` · ${formatCallTokens(usage.inputTokens + usage.outputTokens)} tok · ${formatCallCost(usage.costUsd)}`
    : '';
  return (
    <span title={usage ? `${usage.inputTokens} in / ${usage.outputTokens} out · estimated from list prices` : undefined} style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-soft)', background: 'var(--surface-sunk)', border: '1px solid var(--border)', borderRadius: 'var(--radius-pill)', padding: '3px 9px', whiteSpace: 'nowrap' }}>
      {label}{spend}
    </span>
  );
}

Object.assign(window, { PillButton, ModalShell, GroundingWarning, ProviderBadge });
