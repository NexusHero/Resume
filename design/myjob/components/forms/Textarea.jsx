import React from 'react';

/**
 * Multiline text input. Same focus treatment as <Input>. Auto-sizes to `rows`.
 */
export function Textarea({ label, hint, rows = 4, style = {}, wrapStyle = {}, ...rest }) {
  const [focus, setFocus] = React.useState(false);
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', ...wrapStyle }}>
      {label && (
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10.5px', letterSpacing: 'var(--ls-wide)', textTransform: 'uppercase', color: 'var(--text-soft)' }}>
          {label}
        </span>
      )}
      <textarea
        rows={rows}
        onFocus={() => setFocus(true)}
        onBlur={() => setFocus(false)}
        style={{
          appearance: 'none',
          border: `1px solid ${focus ? 'var(--accent)' : 'var(--border-strong)'}`,
          borderRadius: 'var(--radius-md)',
          background: 'var(--surface-card)',
          fontFamily: 'var(--font-body)',
          fontSize: 'var(--fs-sm)',
          lineHeight: 1.6,
          color: 'var(--text-heading)',
          padding: '11px 13px',
          resize: 'vertical',
          outline: 'none',
          boxShadow: focus ? '0 0 0 3px var(--accent-soft)' : 'none',
          transition: 'border-color var(--dur-fast) var(--ease-out), box-shadow var(--dur-fast) var(--ease-out)',
          ...style,
        }}
        {...rest}
      />
      {hint && <span style={{ fontSize: '11.5px', color: 'var(--text-soft)' }}>{hint}</span>}
    </label>
  );
}
