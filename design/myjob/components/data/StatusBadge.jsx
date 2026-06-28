import React from 'react';

/**
 * The pipeline-stage chip — the most-used status indicator in the recruiting
 * product. Maps a stage key to its German label + status color (a leading dot
 * over a soft fill). Use `dot={false}` for a flat label.
 */
export const STAGES = {
  new: { label: 'Neu', color: 'var(--status-new)', soft: 'var(--status-new-soft)', border: 'var(--status-new-border)', strong: 'var(--status-new-strong)' },
  review: { label: 'Sichtung', color: 'var(--status-review)', soft: 'var(--status-review-soft)', border: 'var(--status-review-border)', strong: 'var(--status-review-strong)' },
  interview: { label: 'Interview', color: 'var(--status-interview)', soft: 'var(--status-interview-soft)', border: 'var(--status-interview-border)', strong: 'var(--status-interview-strong)' },
  offer: { label: 'Angebot', color: 'var(--status-offer)', soft: 'var(--status-offer-soft)', border: 'var(--status-offer-border)', strong: 'var(--status-offer-strong)' },
  hired: { label: 'Eingestellt', color: 'var(--status-hired)', soft: 'var(--status-hired-soft)', border: 'var(--status-hired-border)', strong: 'var(--status-hired-strong)' },
  rejected: { label: 'Absage', color: 'var(--status-rejected)', soft: 'var(--status-rejected-soft)', border: 'var(--status-rejected-border)', strong: 'var(--status-rejected-strong)' },
};

export function StatusBadge({ status = 'new', label, dot = true, size = 'md', style = {}, ...rest }) {
  const s = STAGES[status] || STAGES.new;
  const sz = size === 'sm' ? { fontSize: '10.5px', padding: '2px 8px' } : { fontSize: '11.5px', padding: '4px 10px' };
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        fontFamily: 'var(--font-mono)',
        fontWeight: 'var(--fw-semibold)',
        letterSpacing: '0.02em',
        whiteSpace: 'nowrap',
        borderRadius: 'var(--radius-pill)',
        background: s.soft,
        color: s.strong,
        border: `1px solid ${s.border}`,
        ...sz,
        ...style,
      }}
      {...rest}
    >
      {dot && (
        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: s.color, flexShrink: 0 }} />
      )}
      {label || s.label}
    </span>
  );
}
