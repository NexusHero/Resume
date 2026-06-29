import React from 'react';
import { Avatar } from '../core/Avatar.jsx';
import { Icon } from '../core/Icon.jsx';
import { StatusBadge } from './StatusBadge.jsx';

/**
 * The core list row of the recruiting product: candidate avatar + name + role,
 * the position applied for, a match score, the pipeline status and a meta
 * timestamp. Hover lifts the background. Whole row is clickable.
 */
export function CandidateRow({ name, role, position, src, status = 'new', score, when, selected = false, onClick, style = {}, ...rest }) {
  const [hover, setHover] = React.useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0,1.6fr) minmax(0,1.2fr) 78px 116px 96px',
        alignItems: 'center',
        gap: '14px',
        padding: '10px 16px',
        minHeight: 'var(--row-h)',
        cursor: onClick ? 'pointer' : 'default',
        background: selected ? 'var(--accent-soft)' : hover ? 'var(--surface-subtle)' : 'transparent',
        borderLeft: `3px solid ${selected ? 'var(--accent)' : 'transparent'}`,
        borderBottom: '1px solid var(--border)',
        transition: 'background var(--dur-fast) var(--ease-out)',
        ...style,
      }}
      {...rest}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
        <Avatar name={name} src={src} size="md" />
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'var(--fs-sm)',
              fontWeight: 'var(--fw-bold)',
              color: 'var(--text-heading)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {name}
          </div>
          {role && (
            <div style={{ fontSize: '12px', color: 'var(--text-soft)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {role}
            </div>
          )}
        </div>
      </div>
      <div style={{ minWidth: 0, fontSize: '12.5px', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {position}
      </div>
      <div
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '13px',
          fontWeight: 'var(--fw-semibold)',
          color: score >= 80 ? 'var(--success)' : 'var(--text-muted)',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {score != null ? `${score}%` : '—'}
      </div>
      <div>
        <StatusBadge status={status} size="sm" />
      </div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          gap: '6px',
          fontFamily: 'var(--font-mono)',
          fontSize: '11px',
          color: 'var(--text-soft)',
        }}
      >
        <Icon name="clock" size={12} />
        {when}
      </div>
    </div>
  );
}
