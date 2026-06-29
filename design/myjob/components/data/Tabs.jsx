import React from 'react';

/**
 * Underline tab bar. `tabs` is [{id,label,count?}]. Controlled via `value` +
 * `onChange`. The active tab carries the accent underline.
 */
export function Tabs({ tabs = [], value, onChange, style = {}, ...rest }) {
  return (
    <div
      role="tablist"
      style={{ display: 'flex', alignItems: 'center', gap: '4px', borderBottom: '1px solid var(--border)', ...style }}
      {...rest}
    >
      {tabs.map((t) => {
        const active = t.id === value;
        return (
          <button
            key={t.id}
            role="tab"
            aria-selected={active}
            onClick={() => onChange && onChange(t.id)}
            style={{
              appearance: 'none',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '7px',
              padding: '11px 14px',
              marginBottom: '-1px',
              fontFamily: 'var(--font-body)',
              fontSize: 'var(--fs-sm)',
              fontWeight: 'var(--fw-semibold)',
              color: active ? 'var(--text-heading)' : 'var(--text-soft)',
              borderBottom: `2px solid ${active ? 'var(--accent)' : 'transparent'}`,
              transition: 'color var(--dur-fast) var(--ease-out), border-color var(--dur-fast) var(--ease-out)',
            }}
          >
            {t.label}
            {t.count != null && (
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '10.5px',
                  fontWeight: 'var(--fw-semibold)',
                  color: active ? 'var(--accent-strong)' : 'var(--text-soft)',
                  background: active ? 'var(--accent-soft)' : 'var(--surface-sunk)',
                  border: `1px solid ${active ? 'var(--accent-border)' : 'var(--border)'}`,
                  borderRadius: 'var(--radius-pill)',
                  padding: '1px 7px',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {t.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
