import React from 'react';
import { Icon } from '../core/Icon.jsx';

/**
 * A contact row on the dark sidebar: a glass icon chip beside a value
 * (optionally a link).
 */
export function ContactItem({ icon, href, children, target, style = {}, ...rest }) {
  const value = href ? (
    <a
      href={href}
      target={target}
      style={{ color: 'var(--sidebar-text)', wordBreak: 'break-word' }}
    >
      {children}
    </a>
  ) : (
    <span style={{ wordBreak: 'break-word' }}>{children}</span>
  );

  return (
    <li
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '11px',
        fontSize: 'var(--fs-sm)',
        color: 'var(--sidebar-muted)',
        lineHeight: 1.45,
        listStyle: 'none',
        ...style,
      }}
      {...rest}
    >
      <span
        style={{
          width: '28px',
          height: '28px',
          flexShrink: 0,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--sidebar-glass)',
          border: '1px solid var(--sidebar-border)',
          borderRadius: '7px',
          marginTop: '1px',
          color: '#ffffff',
        }}
      >
        <Icon name={icon} size={14} />
      </span>
      <span style={{ paddingTop: '5px' }}>{value}</span>
    </li>
  );
}
