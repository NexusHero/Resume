import React from 'react';

/**
 * The base surface container. A white sheet with a hairline border and a
 * subtle shadow. Optional `title` + `action` header and `pad` control.
 */
export function Card({ title, subtitle, action, pad = true, children, style = {}, bodyStyle = {}, ...rest }) {
  return (
    <section
      style={{
        background: 'var(--surface-card)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-sm)',
        overflow: 'hidden',
        ...style,
      }}
      {...rest}
    >
      {(title || action) && (
        <header
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            padding: '14px 18px',
            borderBottom: '1px solid var(--border)',
          }}
        >
          <div>
            {title && (
              <h3
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 'var(--fs-lg)',
                  fontWeight: 'var(--fw-bold)',
                  color: 'var(--text-heading)',
                  margin: 0,
                  letterSpacing: '-0.01em',
                }}
              >
                {title}
              </h3>
            )}
            {subtitle && (
              <p style={{ fontSize: '12.5px', color: 'var(--text-soft)', margin: '3px 0 0' }}>{subtitle}</p>
            )}
          </div>
          {action}
        </header>
      )}
      <div style={{ padding: pad ? '18px' : 0, ...bodyStyle }}>{children}</div>
    </section>
  );
}
