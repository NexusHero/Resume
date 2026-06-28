import React from 'react';

/**
 * MatchIndicator — the candidate-FIT signal, and the brand's ownable idea.
 *
 * Deliberately RADIAL (a conic ring) so it can never be confused with the
 * linear neutral ProgressBar that shows mandate *fill / completion*. It rides
 * the accent. Optional two-tier breakdown (Pflicht- vs Bonus-Skills) is what
 * makes the score legible: "9/10 must-haves, 3/6 bonus" beats a bare 74%.
 *
 *   variant="ring"  full ring (+ optional tiers beside it)   — profiles, detail panels
 *   variant="chip"  compact pill "● 74% Match"               — list rows
 *   variant="bare"  ring only, no caption                    — tight spots
 */
const SIZES = {
  sm: { ring: 40, hole: 28, font: '11px', stroke: 6 },
  md: { ring: 58, hole: 42, font: '13px', stroke: 8 },
  lg: { ring: 76, hole: 56, font: '16px', stroke: 10 },
};

export function MatchIndicator({
  value = 0,
  tiers,
  variant = 'ring',
  size = 'md',
  label = 'Match',
  style = {},
  ...rest
}) {
  const pct = Math.max(0, Math.min(100, Math.round(value)));

  if (variant === 'chip') {
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          fontFamily: 'var(--font-body)',
          fontSize: '12px',
          fontWeight: 'var(--fw-semibold)',
          color: 'var(--match-strong)',
          background: 'var(--match-soft)',
          border: '1px solid var(--accent-border)',
          borderRadius: 'var(--radius-pill)',
          padding: '3px 10px 3px 8px',
          whiteSpace: 'nowrap',
          ...style,
        }}
        {...rest}
      >
        <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: 'var(--match)', flexShrink: 0 }} />
        <span style={{ fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums' }}>{pct}%</span>
        {label && <span style={{ color: 'var(--text-muted)', fontWeight: 'var(--fw-medium)' }}>{label}</span>}
      </span>
    );
  }

  const sz = SIZES[size] || SIZES.md;
  const ring = (
    <div
      style={{
        width: sz.ring,
        height: sz.ring,
        borderRadius: '50%',
        flexShrink: 0,
        display: 'grid',
        placeItems: 'center',
        background: `conic-gradient(var(--match) ${pct}%, var(--match-track) 0)`,
      }}
    >
      <div
        style={{
          width: sz.hole,
          height: sz.hole,
          borderRadius: '50%',
          background: 'var(--surface-card)',
          display: 'grid',
          placeItems: 'center',
        }}
      >
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontVariantNumeric: 'tabular-nums',
            fontWeight: 'var(--fw-semibold)',
            fontSize: sz.font,
            color: 'var(--match-strong)',
          }}
        >
          {pct}
        </span>
      </div>
    </div>
  );

  if (variant === 'bare' || !tiers || tiers.length === 0) {
    return <div style={{ display: 'inline-flex', ...style }} {...rest}>{ring}</div>;
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', ...style }} {...rest}>
      {ring}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, minWidth: 0 }}>
        {tiers.map((t, i) => {
          const tp = t.max ? Math.round((t.value / t.max) * 100) : Math.max(0, Math.min(100, t.value));
          const bonus = i > 0;
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)', width: '92px', flexShrink: 0 }}>{t.label}</span>
              <span style={{ flex: 1, height: '7px', borderRadius: 'var(--radius-pill)', background: 'var(--match-track)', overflow: 'hidden' }}>
                <span
                  style={{
                    display: 'block',
                    height: '100%',
                    width: `${tp}%`,
                    borderRadius: 'var(--radius-pill)',
                    background: bonus ? 'var(--match-bonus)' : 'var(--match)',
                    transition: 'width var(--dur-med) var(--ease-out)',
                  }}
                />
              </span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-soft)', fontVariantNumeric: 'tabular-nums', width: '38px', textAlign: 'right', flexShrink: 0 }}>
                {t.max ? `${t.value}/${t.max}` : `${tp}%`}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
