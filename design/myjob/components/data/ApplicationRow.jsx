import React from 'react';
import { Icon } from '../core/Icon.jsx';
import { EntityTile } from '../core/EntityTile.jsx';
import { StatusBadge } from './StatusBadge.jsx';
import { MatchIndicator } from './MatchIndicator.jsx';

/**
 * ApplicationRow — the canonical "one application" row for the applicant app
 * (myJob ▸ Bewerbungen). Absorbs karriere's rich list and bewerber's weaker
 * copy into one home.
 *
 * Mono-detox in practice: the POSITION is the single hero signal (display
 * font), company + location are humanist sans, and mono is reserved for the
 * application ID, the match %, and the timestamp. The match score is a chip
 * (radial language), never confused with a mandate-fill bar.
 *
 * A company gets a rounded-square initials tile (imagery is people-only; a
 * company is not a person, so it never takes a circular Avatar).
 */

export function ApplicationRow({
  position,
  company,
  location,
  appId,
  logo,
  match,
  status = 'new',
  when,
  selected = false,
  onClick,
  style = {},
  ...rest
}) {
  const [hover, setHover] = React.useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '14px',
        padding: '13px 16px',
        cursor: onClick ? 'pointer' : 'default',
        background: selected ? 'var(--accent-soft)' : hover ? 'var(--surface-subtle)' : 'transparent',
        borderLeft: `3px solid ${selected ? 'var(--accent)' : 'transparent'}`,
        borderBottom: '1px solid var(--border)',
        transition: 'background var(--dur-fast) var(--ease-out)',
        ...style,
      }}
      {...rest}
    >
      <EntityTile type="company" name={company} src={logo} size="md" />

      <div style={{ minWidth: 0, flex: 1 }}>
        {/* hero signal — the position. Always wins the row's width. */}
        <div
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'var(--fs-md)',
            fontWeight: 'var(--fw-semibold)',
            color: 'var(--text-heading)',
            letterSpacing: 'var(--ls-tight)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {position}
        </div>
        {/* context — humanist sans; the appId is the only mono on this line. */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px', minWidth: 0, overflow: 'hidden' }}>
          <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0 }}>
            {company}{location ? ` · ${location}` : ''}
          </span>
          {appId && (
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-3xs)', color: 'var(--text-soft)', flexShrink: 0, whiteSpace: 'nowrap' }}>
              {appId}
            </span>
          )}
        </div>
      </div>

      {/* trailing meta — a fixed-width stack so it never collides with the title */}
      <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
        {match != null && <MatchIndicator value={match} variant="chip" />}
        <StatusBadge status={status} size="sm" />
        {when && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-3xs)', color: 'var(--text-soft)', whiteSpace: 'nowrap' }}>
            <Icon name="clock" size={11} />{when}
          </span>
        )}
      </div>
    </div>
  );
}
