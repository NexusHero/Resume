import React from 'react';

/** Hides the native control visually while keeping it focusable and announced. */
const VISUALLY_HIDDEN = { position: 'absolute', width: '1px', height: '1px', margin: '-1px', padding: 0, border: 0, overflow: 'hidden', clip: 'rect(0 0 0 0)', whiteSpace: 'nowrap' };

/**
 * On/off switch. Controlled via `checked` + `onChange`. Track fills with the
 * accent when on. A visually hidden native checkbox with role="switch" carries
 * keyboard, focus and screen reader semantics; the track is decoration only.
 */
export function Switch({ label, checked = false, onChange, disabled = false, style = {}, ...rest }) {
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
        role="switch"
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
          position: 'relative',
          width: '38px',
          height: '22px',
          flexShrink: 0,
          borderRadius: 'var(--radius-pill)',
          background: checked ? 'var(--accent)' : 'var(--border-strong)',
          boxShadow: focus ? '0 0 0 3px var(--accent-soft)' : 'none',
          transition: 'background var(--dur-med) var(--ease-out)',
        }}
      >
        <span
          style={{
            position: 'absolute',
            top: '2px',
            left: checked ? '18px' : '2px',
            width: '18px',
            height: '18px',
            borderRadius: '50%',
            background: '#ffffff',
            boxShadow: '0 1px 2px rgba(0,0,0,0.25)',
            transition: 'left var(--dur-med) var(--ease-out)',
          }}
        />
      </span>
      {label && <span style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-body)' }}>{label}</span>}
    </label>
  );
}
