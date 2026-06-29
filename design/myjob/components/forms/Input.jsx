import React from 'react';
import { Icon } from '../core/Icon.jsx';

/**
 * Text input with an optional leading icon and label. Focus draws the accent
 * border + soft glow. Error swaps to the danger color.
 */
export function Input({ label, icon, hint, error, type = 'text', style = {}, wrapStyle = {}, ...rest }) {
  const [focus, setFocus] = React.useState(false);
  const borderColor = error ? 'var(--danger)' : focus ? 'var(--accent)' : 'var(--border-strong)';
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', ...wrapStyle }}>
      {label && (
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10.5px', letterSpacing: 'var(--ls-wide)', textTransform: 'uppercase', color: 'var(--text-soft)' }}>
          {label}
        </span>
      )}
      <span
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '9px',
          background: 'var(--surface-card)',
          border: `1px solid ${borderColor}`,
          borderRadius: 'var(--radius-md)',
          padding: '0 12px',
          boxShadow: focus ? '0 0 0 3px var(--accent-soft)' : 'none',
          transition: 'border-color var(--dur-fast) var(--ease-out), box-shadow var(--dur-fast) var(--ease-out)',
        }}
      >
        {icon && <Icon name={icon} size={16} style={{ color: 'var(--text-soft)' }} />}
        <input
          type={type}
          onFocus={() => setFocus(true)}
          onBlur={() => setFocus(false)}
          style={{
            flex: 1,
            minWidth: 0,
            appearance: 'none',
            border: 'none',
            outline: 'none',
            background: 'transparent',
            fontFamily: 'var(--font-body)',
            fontSize: 'var(--fs-sm)',
            color: 'var(--text-heading)',
            padding: '10px 0',
            ...style,
          }}
          {...rest}
        />
      </span>
      {(hint || error) && (
        <span style={{ fontSize: '11.5px', color: error ? 'var(--danger)' : 'var(--text-soft)' }}>{error || hint}</span>
      )}
    </label>
  );
}
