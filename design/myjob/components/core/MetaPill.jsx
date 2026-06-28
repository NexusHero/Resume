import React from 'react';
import { Icon } from './Icon.jsx';
import { Badge } from './Badge.jsx';

/**
 * MetaPill — a metadata value (date, location, salary, count) with a leading
 * icon. IVE MERGE: this is now a thin PRESET of <Badge> (the one label-token
 * primitive), not its own chip — same shape, same type, tabular numerals.
 * Kept as a named export so existing call-sites keep working.
 *
 *   tone="default" → subtle Badge   ·   tone="accent" → soft Badge
 */
export function MetaPill({ children, icon = 'calendar', tone = 'default', style = {}, ...rest }) {
  return (
    <Badge
      variant={tone === 'accent' ? 'soft' : 'subtle'}
      icon={icon ? <Icon name={icon} size={12} /> : null}
      style={{ fontVariantNumeric: 'tabular-nums', ...style }}
      {...rest}
    >
      {children}
    </Badge>
  );
}
