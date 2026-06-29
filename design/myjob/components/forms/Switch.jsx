import React from 'react';

/**
 * On/off switch. Controlled via `checked` + `onChange`. Track fills with the
 * accent when on.
 */
export function Switch({ label, checked = false, onChange, disabled = false, style = {}, ...rest }) {
  return (
    <label
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '10px',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        ...style,
      }}
      {...rest}
    >
      <span
        onClick={() => !disabled && onChange && onChange(!checked)}
        style={{
          position: 'relative',
          width: '38px',
          height: '22px',
          flexShrink: 0,
          borderRadius: 'var(--radius-pill)',
          background: checked ? 'var(--accent)' : 'var(--border-strong)',
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
