import React from 'react';

/**
 * Framed profile image with an initials fallback behind it.
 * Rounded-square by default (the resume portrait); pass radius="999px" for a circle.
 */
export function Avatar({
  src,
  initials = '',
  alt = '',
  size = 257,
  radius = 'var(--radius-lg)',
  objectPosition = 'center 15%',
  zoom = 1.25,
  style = {},
  ...rest
}) {
  return (
    <div
      style={{
        position: 'relative',
        width: typeof size === 'number' ? `${size}px` : size,
        height: typeof size === 'number' ? `${size}px` : size,
        borderRadius: radius,
        border: '1px solid var(--sidebar-border-strong)',
        background: 'var(--sidebar-glass)',
        overflow: 'hidden',
        isolation: 'isolate',
        boxShadow: 'var(--shadow-dark-sm), var(--shadow-dark-md)',
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
          fontSize: '54px',
          fontWeight: 'var(--fw-bold)',
          letterSpacing: 'var(--ls-tighter)',
          color: '#ffffff',
          background:
            'radial-gradient(120% 80% at 20% 10%, color-mix(in oklch, var(--accent) 28%, transparent) 0%, transparent 60%), linear-gradient(160deg, var(--ink-700) 0%, var(--ink-900) 100%)',
          zIndex: 0,
        }}
      >
        {initials}
      </div>
      {src && (
        <img
          src={src}
          alt={alt}
          onError={(e) => { e.currentTarget.style.display = 'none'; }}
          style={{
            position: 'relative',
            zIndex: 1,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition,
            display: 'block',
            transform: `scale(${zoom})`,
            transformOrigin: 'center 18%',
          }}
        />
      )}
    </div>
  );
}
