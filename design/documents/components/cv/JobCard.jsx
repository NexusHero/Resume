import React from 'react';
import { Icon } from '../core/Icon.jsx';
import { Badge } from '../core/Badge.jsx';
import { MetaPill } from '../core/MetaPill.jsx';

/**
 * A single experience entry on the <Timeline>. Renders its own rail node,
 * a header (title · company + date pill), an optional tech-stack strip and
 * a bullet list (pass <li> children).
 */
export function JobCard({ title, company, period, current = false, tech = [], bullets = [], children, style = {}, ...rest }) {
  return (
    <article
      style={{ position: 'relative', marginBottom: '32px', breakInside: 'avoid', ...style }}
      {...rest}
    >
      {/* rail node */}
      <span
        aria-hidden="true"
        style={{
          position: 'absolute',
          left: '-30px',
          top: '7px',
          width: '13.5px',
          height: '13.5px',
          borderRadius: '50%',
          background: current ? 'var(--accent)' : '#ffffff',
          border: `2px solid ${current ? 'var(--accent)' : 'var(--text-heading)'}`,
          boxShadow: '0 0 0 4px #ffffff, 0 0 0 5px var(--border)',
          zIndex: 1,
        }}
      />

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          gap: '10px',
          marginBottom: '4px',
        }}
      >
        <h3
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: '16.5px',
            fontWeight: 'var(--fw-bold)',
            color: 'var(--text-heading)',
            margin: 0,
            letterSpacing: '-0.01em',
          }}
        >
          {title}
          {company && (
            <>
              {' · '}
              <span style={{ color: 'var(--text-muted)', fontWeight: 'var(--fw-semibold)' }}>{company}</span>
            </>
          )}
        </h3>
        {period && <MetaPill tone={current ? 'accent' : 'default'}>{period}</MetaPill>}
      </div>

      {tech.length > 0 && (
        <div style={{ margin: '12px 0 14px', display: 'flex', alignItems: 'flex-start', gap: '10px', flexWrap: 'wrap' }}>
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
            {tech.map((t, i) => (
              <Badge key={i} size="sm">{t}</Badge>
            ))}
          </div>
        </div>
      )}

      {(bullets.length > 0 || children) && (
        <ul style={{ margin: '8px 0 0', paddingLeft: '18px' }}>
          {bullets.map((b, i) => (
            /* li color sets the ::marker; span restores body color for the text */
            <li key={i} style={{ color: 'var(--accent)', marginBottom: '4px', fontSize: '14px', lineHeight: 1.6 }}>
              <span style={{ color: 'var(--text-body)' }}>{b}</span>
            </li>
          ))}
          {children}
        </ul>
      )}
    </article>
  );
}
