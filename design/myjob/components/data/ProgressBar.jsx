import React from 'react';

/**
 * A thin progress / score bar. `value` 0–100. `tone` picks the fill color;
 * pass a status key to tie it to a pipeline stage.
 */
const TONES = {
  accent: 'var(--accent)',
  success: 'var(--success)',
  warning: 'var(--warning)',
  danger: 'var(--danger)',
  new: 'var(--status-new)',
  review: 'var(--status-review)',
  interview: 'var(--status-interview)',
  offer: 'var(--status-offer)',
  hired: 'var(--status-hired)',
};

export function ProgressBar({ value = 0, tone = 'accent', height = 6, showValue = false, label, style = {}, ...rest }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', ...style }} {...rest}>
      {(label || showValue) && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontFamily: 'var(--font-mono)',
            fontSize: '11px',
            color: 'var(--text-soft)',
          }}
        >
          <span>{label}</span>
          {showValue && (
            <span style={{ fontVariantNumeric: 'tabular-nums', color: 'var(--text-muted)' }}>{pct}%</span>
          )}
        </div>
      )}
      <div
        style={{
          width: '100%',
          height: `${height}px`,
          borderRadius: 'var(--radius-pill)',
          background: 'var(--surface-sunk)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: '100%',
            borderRadius: 'var(--radius-pill)',
            background: TONES[tone] || tone,
            transition: 'width var(--dur-med) var(--ease-out)',
          }}
        />
      </div>
    </div>
  );
}
