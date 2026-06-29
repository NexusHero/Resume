import React from 'react';
import { Icon } from '../core/Icon.jsx';

/**
 * A KPI tile for the dashboard — big number, label, an optional delta trend,
 * and an accent icon. Delta `dir` colors the change green/red.
 */
export function StatCard({ label, value, delta, dir = 'up', icon, style = {}, ...rest }) {
  const deltaColor = dir === 'down' ? 'var(--danger)' : 'var(--success)';
  return (
    <div
      style={{
        background: 'var(--surface-card)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-sm)',
        padding: '18px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        ...style,
      }}
      {...rest}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '10.5px',
            letterSpacing: 'var(--ls-wide)',
            textTransform: 'uppercase',
            color: 'var(--text-soft)',
          }}
        >
          {label}
        </span>
        {icon && (
          <span
            style={{
              width: '30px',
              height: '30px',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 'var(--radius-md)',
              background: 'var(--accent-soft)',
              color: 'var(--accent-strong)',
            }}
          >
            <Icon name={icon} size={16} />
          </span>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: '10px' }}>
        <span
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'var(--fs-4xl)',
            fontWeight: 'var(--fw-bold)',
            color: 'var(--text-heading)',
            lineHeight: 1,
            letterSpacing: 'var(--ls-tight)',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {value}
        </span>
        {delta != null && (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '3px',
              fontFamily: 'var(--font-mono)',
              fontSize: '12px',
              fontWeight: 'var(--fw-semibold)',
              color: deltaColor,
              paddingBottom: '3px',
            }}
          >
            <Icon name={dir === 'down' ? 'chevronDown' : 'chevronUp'} size={13} strokeWidth={2.4} />
            {delta}
          </span>
        )}
      </div>
    </div>
  );
}
