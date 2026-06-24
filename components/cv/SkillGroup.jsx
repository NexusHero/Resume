import React from 'react';

/**
 * A labelled cluster of skill tags. Pass <Badge> children.
 * `onDark` styles the heading for the sidebar.
 */
export function SkillGroup({ label, children, onDark = true, style = {}, ...rest }) {
  return (
    <div style={{ marginBottom: '18px', ...style }} {...rest}>
      {label && (
        <h3
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '11px',
            fontWeight: 'var(--fw-semibold)',
            color: onDark ? '#ffffff' : 'var(--text-soft)',
            opacity: onDark ? 0.85 : 1,
            margin: '0 0 9px',
            letterSpacing: 'var(--ls-wide)',
            textTransform: 'uppercase',
          }}
        >
          {label}
        </h3>
      )}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--gap-badge)' }}>
        {children}
      </div>
    </div>
  );
}
