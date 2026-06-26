import React from 'react';
import { Icon } from '../core/Icon.jsx';

/**
 * Sidebar section title: uppercase mono label with a leading icon and an
 * underline rule. Sits on the dark sidebar.
 */
export function SideTitle({ icon, children, style = {}, ...rest }) {
  return (
    <h2
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        fontFamily: 'var(--font-mono)',
        fontSize: '11px',
        fontWeight: 'var(--fw-semibold)',
        letterSpacing: 'var(--ls-wider)',
        textTransform: 'uppercase',
        color: '#ffffff',
        margin: '0 0 14px',
        paddingBottom: '10px',
        borderBottom: '1px solid var(--sidebar-border)',
        ...style,
      }}
      {...rest}
    >
      {icon && <Icon name={icon} size={14} style={{ opacity: 0.9 }} />}
      {children}
    </h2>
  );
}
