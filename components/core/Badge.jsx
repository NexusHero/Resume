import React from 'react';

const BASE = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '5px',
  fontFamily: 'var(--font-mono)',
  fontWeight: 'var(--fw-medium)',
  lineHeight: 1.4,
  whiteSpace: 'nowrap',
  borderRadius: 'var(--radius-sm)',
  border: '1px solid transparent',
  transition: 'background var(--dur-fast) var(--ease-out), border-color var(--dur-fast) var(--ease-out), color var(--dur-fast) var(--ease-out), transform var(--dur-fast) var(--ease-out)',
};

const SIZES = {
  sm: { fontSize: '11px', padding: '3px 8px' },
  md: { fontSize: '12px', padding: '4px 10px' },
};

const VARIANTS = {
  /* light main column — outlined chip */
  outline: {
    background: 'var(--surface-card)',
    color: 'var(--text-muted)',
    borderColor: 'var(--border-strong)',
  },
  /* filled accent — a highlighted / primary skill */
  solid: {
    background: 'var(--accent)',
    color: 'var(--accent-contrast)',
    borderColor: 'var(--accent)',
  },
  /* translucent glass on the dark sidebar */
  glass: {
    background: 'var(--sidebar-glass)',
    color: 'var(--sidebar-text)',
    borderColor: 'var(--sidebar-border-strong)',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
  },
  /* solid light chip on the dark sidebar — a key/primary language */
  light: {
    background: '#ffffff',
    color: 'var(--ink-900)',
    borderColor: '#ffffff',
    fontWeight: 'var(--fw-semibold)',
  },
};

export function Badge({ children, variant = 'outline', size = 'md', icon = null, style = {}, ...rest }) {
  return (
    <span style={{ ...BASE, ...SIZES[size], ...VARIANTS[variant], ...style }} {...rest}>
      {icon}
      {children}
    </span>
  );
}
