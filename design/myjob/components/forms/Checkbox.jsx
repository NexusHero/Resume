import React from 'react';
import { Icon } from '../core/Icon.jsx';

/** Hides the native control visually while keeping it focusable and announced. */
const VISUALLY_HIDDEN = { position: 'absolute', width: '1px', height: '1px', margin: '-1px', padding: 0, border: 0, overflow: 'hidden', clip: 'rect(0 0 0 0)', whiteSpace: 'nowrap' };

/**
 * Checkbox with a label. Controlled via `checked` + `onChange`. A visually
 * hidden native <input type="checkbox"> carries keyboard, focus and screen
 * reader semantics; the styled box is decoration only.
 */
export function Checkbox({ label, checked = false, onChange, disabled = false, style = {}, ...rest }) {
  const [focus, setFocus] = React.useState(false);
  return (
    <label
      style={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '10px',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        ...style,
      }}
      {...rest}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange && onChange(e.target.checked)}
        onFocus={() => setFocus(true)}
        onBlur={() => setFocus(false)}
        style={VISUALLY_HIDDEN}
      />
      <span
        aria-hidden="true"
        style={{
          width: '18px',
          height: '18px',
          flexShrink: 0,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 'var(--radius-xs)',
          border: `1.5px solid ${checked ? 'var(--accent)' : 'var(--border-strong)'}`,
          background: checked ? 'var(--accent)' : 'var(--surface-card)',
          color: 'var(--accent-contrast)',
          boxShadow: focus ? '0 0 0 3px var(--accent-soft)' : 'none',
          transition: 'background var(--dur-fast) var(--ease-out), border-color var(--dur-fast) var(--ease-out)',
        }}
      >
        {checked && <Icon name="check" size={13} strokeWidth={2.6} />}
      </span>
      {label && <span style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-body)' }}>{label}</span>}
    </label>
  );
}
