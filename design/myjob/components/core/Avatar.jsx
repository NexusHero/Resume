import React from 'react';

/**
 * Candidate / user avatar. Circle by default (app chrome); pass a square
 * radius for document portraits. Renders an initials fallback behind the image
 * so a broken/empty src still reads as a person.
 */
function initialsFrom(name = '') {
  return name.trim().split(/\s+/).slice(0, 2).map((w) => w[0] || '').join('').toUpperCase();
}

const SIZES = { xs: 24, sm: 32, md: 40, lg: 56, xl: 72 };

export function Avatar({ src, name = '', initials, size = 'md', radius = '50%', ring = false, style = {}, ...rest }) {
  const px = typeof size === 'number' ? size : SIZES[size] || 40;
  const ini = initials != null ? initials : initialsFrom(name);
  const fontSize = Math.round(px * 0.38);
  return (
    <div
      title={name || undefined}
      style={{
        position: 'relative',
        width: `${px}px`,
        height: `${px}px`,
        flexShrink: 0,
        borderRadius: radius,
        overflow: 'hidden',
        isolation: 'isolate',
        boxShadow: ring ? '0 0 0 2px var(--surface-card), 0 0 0 4px var(--accent)' : 'none',
        ...style,
      }}
      {...rest}
    >
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'var(--font-display)',
          fontSize: `${fontSize}px`,
          fontWeight: 'var(--fw-semibold)',
          letterSpacing: 'var(--ls-tight)',
          color: '#ffffff',
          background: 'linear-gradient(155deg, var(--ink-700) 0%, var(--ink-900) 100%)',
          zIndex: 0,
        }}
      >
        {ini}
      </div>
      {src && (
        <img
          src={src}
          alt={name}
          onError={(e) => { e.currentTarget.style.display = 'none'; }}
          style={{ position: 'relative', zIndex: 1, width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
      )}
    </div>
  );
}
