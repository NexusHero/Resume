import React from 'react';
import { Icon } from '../core/Icon.jsx';

/**
 * Styled native select with a custom chevron. Pass `options` as
 * [{value,label}] or plain strings.
 */
export function Select({ label, options = [], value, onChange, style = {}, wrapStyle = {}, ...rest }) {
  const [focus, setFocus] = React.useState(false);
  const opts = options.map((o) => (typeof o === 'string' ? { value: o, label: o } : o));
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', ...wrapStyle }}>
      {label && (
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10.5px', letterSpacing: 'var(--ls-wide)', textTransform: 'uppercase', color: 'var(--text-soft)' }}>
          {label}
        </span>
      )}
      <span style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        <select
          value={value}
          onChange={onChange}
          onFocus={() => setFocus(true)}
          onBlur={() => setFocus(false)}
          style={{
            appearance: 'none',
            WebkitAppearance: 'none',
            width: '100%',
            border: `1px solid ${focus ? 'var(--accent)' : 'var(--border-strong)'}`,
            borderRadius: 'var(--radius-md)',
            background: 'var(--surface-card)',
            fontFamily: 'var(--font-body)',
            fontSize: 'var(--fs-sm)',
            color: 'var(--text-heading)',
            padding: '10px 38px 10px 13px',
            outline: 'none',
            cursor: 'pointer',
            boxShadow: focus ? '0 0 0 3px var(--accent-soft)' : 'none',
            transition: 'border-color var(--dur-fast) var(--ease-out), box-shadow var(--dur-fast) var(--ease-out)',
            ...style,
          }}
          {...rest}
        >
          {opts.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <Icon name="chevronDown" size={15} style={{ position: 'absolute', right: '12px', color: 'var(--text-soft)', pointerEvents: 'none' }} />
      </span>
    </label>
  );
}
