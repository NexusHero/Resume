import React from 'react';
import { Avatar } from './Avatar.jsx';

/**
 * EntityTile — the one media primitive for "a thing in a list". IVE MERGE:
 * ApplicationRow and PositionCard each had their own copy of a rounded-square
 * company tile; this is now the single source.
 *
 *   type="person"  → a circular Avatar (initials or photo). People are round.
 *   type="company" → a rounded-square initials/logo tile. A company is not a
 *                    person, so it never takes a circular avatar.
 *
 * `src` is a photo (person) or logo (company). Sizes match the Avatar scale.
 */
const SIZES = { sm: 32, md: 40, lg: 44, xl: 56 };

export function EntityTile({ type = 'company', name = '', src, size = 'md', radius = 'var(--radius-md)', style = {}, ...rest }) {
  if (type === 'person') {
    return <Avatar name={name} src={src} size={size} style={style} {...rest} />;
  }
  const px = typeof size === 'number' ? size : SIZES[size] || 40;
  if (src) {
    return (
      <img
        src={src}
        alt=""
        style={{ width: px, height: px, borderRadius: radius, objectFit: 'cover', flexShrink: 0, border: '1px solid var(--border)', ...style }}
        {...rest}
      />
    );
  }
  const initials = (name || '?').split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
  return (
    <span
      style={{
        width: px,
        height: px,
        borderRadius: radius,
        flexShrink: 0,
        display: 'grid',
        placeItems: 'center',
        background: 'var(--surface-sunk)',
        border: '1px solid var(--border)',
        fontFamily: 'var(--font-display)',
        fontWeight: 'var(--fw-semibold)',
        fontSize: Math.round(px * 0.32),
        color: 'var(--text-muted)',
        ...style,
      }}
      {...rest}
    >
      {initials}
    </span>
  );
}
