import React from 'react';
import { Icon } from './Icon.jsx';

/**
 * A small pill for a date range or status, with an optional leading icon.
 * Used on job headers, education rows and certificates.
 */
export function MetaPill({ children, icon = 'calendar', tone = 'default', style = {}, ...rest }) {
  const tones = {
    default: {
      background: 'var(--surface-sunk)',
      borderColor: 'var(--border)',
      color: 'var(--text-soft)',
    },
    accent: {
      background: 'var(--accent-soft)',
      borderColor: 'var(--accent-border)',
      color: 'var(--accent-strong)',
    },
  };
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        fontFamily: 'var(--font-mono)',
        fontSize: '12px',
        fontWeight: 'var(--fw-medium)',
        whiteSpace: 'nowrap',
        fontVariantNumeric: 'tabular-nums',
        padding: '3px 9px',
        borderRadius: 'var(--radius-pill)',
        border: '1px solid',
        ...tones[tone],
        ...style,
      }}
      {...rest}
    >
      {icon && <Icon name={icon} size={12} />}
      {children}
    </span>
  );
}
