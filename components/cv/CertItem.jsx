import React from 'react';
import { Icon } from '../core/Icon.jsx';

/**
 * A certificate / training card: an accent icon tile beside a title and body.
 * `highlight` draws the accent border (use for an in-progress / featured cert).
 */
export function CertItem({ icon = 'award', title, children, highlight = false, style = {}, ...rest }) {
  return (
    <div
      style={{
        position: 'relative',
        display: 'flex',
        gap: '14px',
        alignItems: 'flex-start',
        padding: 'var(--pad-card)',
        background: 'var(--surface-card)',
        border: `1px solid ${highlight ? 'var(--accent)' : 'var(--border)'}`,
        borderRadius: 'var(--radius-lg)',
        breakInside: 'avoid',
        ...style,
      }}
      {...rest}
    >
      <span
        style={{
          width: '38px',
          height: '38px',
          flexShrink: 0,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: highlight ? 'var(--accent)' : 'var(--text-heading)',
          color: '#ffffff',
          borderRadius: '9px',
        }}
      >
        <Icon name={icon} size={18} />
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <strong
          style={{
            display: 'block',
            fontFamily: 'var(--font-display)',
            fontSize: 'var(--fs-md)',
            fontWeight: 'var(--fw-bold)',
            color: 'var(--text-heading)',
            marginBottom: '2px',
            letterSpacing: '-0.005em',
          }}
        >
          {title}
        </strong>
        <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-muted)', lineHeight: 1.55 }}>
          {children}
        </div>
      </div>
    </div>
  );
}
