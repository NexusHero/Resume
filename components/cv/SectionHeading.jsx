import React from 'react';
import { Icon } from '../core/Icon.jsx';

/**
 * Main-column section header: a small mono kicker (with icon) above a large
 * display heading underlined by a hairline rule.
 */
export function SectionHeading({ kicker, icon, children, style = {}, ...rest }) {
  return (
    <header style={{ ...style }} {...rest}>
      {kicker && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontFamily: 'var(--font-mono)',
            fontSize: '11px',
            fontWeight: 'var(--fw-semibold)',
            letterSpacing: 'var(--ls-wider)',
            textTransform: 'uppercase',
            color: 'var(--text-soft)',
            margin: '0 0 8px',
          }}
        >
          {icon && <Icon name={icon} size={14} />}
          {kicker}
        </div>
      )}
      <h2
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'var(--fs-3xl)',
          fontWeight: 'var(--fw-bold)',
          letterSpacing: 'var(--ls-tight)',
          color: 'var(--text-heading)',
          margin: '0 0 22px',
          paddingBottom: '14px',
          borderBottom: '1px solid var(--border)',
        }}
      >
        {children}
      </h2>
    </header>
  );
}
