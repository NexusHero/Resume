import React from 'react';

/**
 * The primary action control. Mono label + pill shape is the brand's
 * "engineering signature". Variants map to the recruiting product's intent
 * hierarchy; sizes follow the 4px grid.
 */
const SIZES = {
  sm: { fontSize: '12px', padding: '7px 14px', gap: '6px' },
  md: { fontSize: '13px', padding: '10px 18px', gap: '7px' },
  lg: { fontSize: '14px', padding: '12px 24px', gap: '8px' },
};

const VARIANTS = {
  /* filled accent — the one primary action on a view */
  primary: { background: 'var(--accent)', color: 'var(--accent-contrast)', border: '1px solid var(--accent)' },
  /* dark ink — a strong secondary (e.g. on light toolbars) */
  ink: { background: 'var(--ink-900)', color: '#ffffff', border: '1px solid var(--ink-900)' },
  /* outlined — secondary action */
  outline: { background: 'var(--surface-card)', color: 'var(--text-body)', border: '1px solid var(--border-strong)' },
  /* quiet — tertiary, low-emphasis */
  ghost: { background: 'transparent', color: 'var(--text-muted)', border: '1px solid transparent' },
  /* destructive */
  danger: { background: 'var(--danger)', color: '#ffffff', border: '1px solid var(--danger)' },
};

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  iconLeft = null,
  iconRight = null,
  block = false,
  disabled = false,
  type = 'button',
  style = {},
  ...rest
}) {
  return (
    <button
      type={type}
      disabled={disabled}
      style={{
        display: block ? 'flex' : 'inline-flex',
        width: block ? '100%' : 'auto',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'var(--font-mono)',
        fontWeight: 'var(--fw-semibold)',
        lineHeight: 1,
        whiteSpace: 'nowrap',
        borderRadius: 'var(--radius-pill)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.45 : 1,
        transition: 'transform var(--dur-fast) var(--ease-out), box-shadow var(--dur-fast) var(--ease-out), background var(--dur-fast) var(--ease-out), border-color var(--dur-fast) var(--ease-out)',
        ...SIZES[size],
        ...VARIANTS[variant],
        ...style,
      }}
      onMouseEnter={(e) => {
        if (!disabled) {
          e.currentTarget.style.transform = 'translateY(-1px)';
          e.currentTarget.style.boxShadow = 'var(--shadow-md)';
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'none';
        e.currentTarget.style.boxShadow = 'none';
      }}
      {...rest}
    >
      {iconLeft}
      {children}
      {iconRight}
    </button>
  );
}
