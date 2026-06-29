import React from 'react';

/**
 * Badge — THE one label-token primitive. Skills, tags, counts, metadata and the
 * status preset all build on this (MetaPill and StatusBadge are thin presets),
 * so the system has a single labelled-chip vocabulary in one shape (pill).
 */
const BASE = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '5px',
  fontFamily: 'var(--font-mono)',
  fontWeight: 'var(--fw-medium)',
  lineHeight: 1.4,
  whiteSpace: 'nowrap',
  borderRadius: 'var(--radius-pill)',
  border: '1px solid transparent',
};

const SIZES = {
  sm: { fontSize: '11px', padding: '3px 8px' },
  md: { fontSize: '12px', padding: '4px 10px' },
};

const VARIANTS = {
  outline: { background: 'var(--surface-card)', color: 'var(--text-muted)', borderColor: 'var(--border-strong)' },
  subtle: { background: 'var(--surface-sunk)', color: 'var(--text-muted)', borderColor: 'var(--border)' },
  solid: { background: 'var(--accent)', color: 'var(--accent-contrast)', borderColor: 'var(--accent)' },
  soft: { background: 'var(--accent-soft)', color: 'var(--accent-strong)', borderColor: 'var(--accent-border)' },
  glass: {
    background: 'var(--sidebar-glass)',
    color: 'var(--sidebar-text)',
    borderColor: 'var(--sidebar-border-strong)',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
  },
  light: { background: '#ffffff', color: 'var(--ink-900)', borderColor: '#ffffff', fontWeight: 'var(--fw-semibold)' },
};

export function Badge({ children, variant = 'outline', size = 'md', icon = null, style = {}, ...rest }) {
  return (
    <span style={{ ...BASE, ...SIZES[size], ...VARIANTS[variant], ...style }} {...rest}>
      {icon}
      {children}
    </span>
  );
}
