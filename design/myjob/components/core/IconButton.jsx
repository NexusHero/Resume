import React from 'react';
import { Icon } from './Icon.jsx';

/**
 * A square, icon-only button for toolbars and row actions.
 * Tones mirror Button but optimised for a single glyph. Always pass `label`
 * for accessibility (title + aria-label).
 */
const SIZES = {
  sm: { width: '30px', height: '30px', icon: 15, radius: 'var(--radius-sm)' },
  md: { width: '36px', height: '36px', icon: 17, radius: 'var(--radius-md)' },
  lg: { width: '44px', height: '44px', icon: 20, radius: 'var(--radius-md)' },
};

const VARIANTS = {
  outline: { background: 'var(--surface-card)', color: 'var(--text-muted)', border: '1px solid var(--border-strong)' },
  ghost: { background: 'transparent', color: 'var(--text-soft)', border: '1px solid transparent' },
  ink: { background: 'var(--ink-900)', color: '#ffffff', border: '1px solid var(--ink-900)' },
  glass: { background: 'var(--sidebar-glass)', color: '#ffffff', border: '1px solid var(--sidebar-border-strong)' },
  accent: { background: 'var(--accent)', color: 'var(--accent-contrast)', border: '1px solid var(--accent)' },
};

export function IconButton({ icon, label, variant = 'outline', size = 'md', disabled = false, style = {}, ...rest }) {
  const s = SIZES[size];
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: s.width,
        height: s.height,
        borderRadius: s.radius,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.4 : 1,
        transition: 'background var(--dur-fast) var(--ease-out), border-color var(--dur-fast) var(--ease-out), color var(--dur-fast) var(--ease-out)',
        ...VARIANTS[variant],
        ...style,
      }}
      {...rest}
    >
      <Icon name={icon} size={s.icon} />
    </button>
  );
}
