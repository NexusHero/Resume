import React from 'react';
import { Icon } from '../core/Icon.jsx';
import { Badge } from '../core/Badge.jsx';
import { MetaPill } from '../core/MetaPill.jsx';

/**
 * An education entry as a bordered card: header (degree + school + date),
 * optional tech-stack strip and accent-marked bullets.
 */
export function EduItem({ title, school, period, tech = [], bullets = [], style = {}, ...rest }) {
  return (
    <div
      style={{
        padding: 'var(--pad-card)',
        background: 'var(--surface-card)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        breakInside: 'avoid',
        ...style,
      }}
      {...rest}
    >
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'baseline', gap: '8px' }}>
        <div>
          <h3
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'var(--fs-lg)',
              fontWeight: 'var(--fw-bold)',
              color: 'var(--text-heading)',
              margin: 0,
              letterSpacing: '-0.01em',
            }}
          >
            {title}
          </h3>
          {school && (
            <p style={{ color: 'var(--text-muted)', fontWeight: 'var(--fw-medium)', fontSize: 'var(--fs-sm)', margin: '3px 0 0' }}>
              {school}
            </p>
          )}
        </div>
        {period && <MetaPill>{period}</MetaPill>}
      </div>

      {tech.length > 0 && (
        <div style={{ margin: '12px 0 0', display: 'flex', alignItems: 'flex-start', gap: '10px', flexWrap: 'wrap' }}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              fontFamily: 'var(--font-mono)',
              fontSize: '10.5px',
              fontWeight: 'var(--fw-semibold)',
              letterSpacing: 'var(--ls-wider)',
              textTransform: 'uppercase',
              color: 'var(--text-soft)',
              paddingTop: '5px',
              flexShrink: 0,
            }}
          >
            <Icon name="zap" size={12} /> Tech Stack
          </span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--gap-badge)' }}>
            {tech.map((t, i) => (<Badge key={i} size="sm">{t}</Badge>))}
          </div>
        </div>
      )}

      {bullets.length > 0 && (
        <ul style={{ margin: '10px 0 0', paddingLeft: '18px' }}>
          {bullets.map((b, i) => (
            <li key={i} style={{ color: 'var(--accent)', marginBottom: '3px', fontSize: '14px', lineHeight: 1.55 }}>
              <span style={{ color: 'var(--text-body)' }}>{b}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
