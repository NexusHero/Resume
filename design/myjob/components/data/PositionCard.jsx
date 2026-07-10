import React from 'react';
import { Icon } from '../core/Icon.jsx';
import { EntityTile } from '../core/EntityTile.jsx';
import { MetaPill } from '../core/MetaPill.jsx';
import { MatchIndicator } from './MatchIndicator.jsx';
import { StatusBadge } from './StatusBadge.jsx';

/**
 * PositionCard — the "Stelle" object: the trackable job posting, and the thing
 * the recruiter applies a candidate TO. This is the entity the system was
 * missing — it carries the description, the skill requirements, and (crucially
 * for the DACH market) its COUNTRY and SOURCE as first-class fields, so Swiss
 * postings (jobs.ch / jobup.ch / job-room.ch, CHF, Pensum %) are modelled, not
 * bolted on.
 *
 * Two contexts:
 *   • plain — a posting in the Stellen list (no candidate).
 *   • matched — shown against a candidate: a MatchIndicator chip appears and
 *     each required skill is marked met (✓) or missing, and the primary action
 *     becomes "<Name> bewerben" (apply on the candidate's behalf).
 */

const FLAGS = {
  DE: (
    <g>
      <rect width="22" height="5.33" y="0" fill="#000" />
      <rect width="22" height="5.34" y="5.33" fill="#DD0000" />
      <rect width="22" height="5.33" y="10.67" fill="#FFCE00" />
    </g>
  ),
  AT: (
    <g>
      <rect width="22" height="5.33" y="0" fill="#ED2939" />
      <rect width="22" height="5.34" y="5.33" fill="#fff" />
      <rect width="22" height="5.33" y="10.67" fill="#ED2939" />
    </g>
  ),
  CH: (
    <g>
      <rect width="22" height="16" fill="#D52B1E" />
      <rect x="9.2" y="3.4" width="3.6" height="9.2" fill="#fff" />
      <rect x="6.4" y="6.2" width="9.2" height="3.6" fill="#fff" />
    </g>
  ),
};
const COUNTRY_LABEL = { DE: 'Deutschland', AT: 'Österreich', CH: 'Schweiz' };

function Flag({ country }) {
  const f = FLAGS[country];
  if (!f) return null;
  return (
    <span
      title={COUNTRY_LABEL[country]}
      style={{ display: 'inline-flex', width: '18px', height: '13px', borderRadius: '3px', overflow: 'hidden', flexShrink: 0, boxShadow: 'inset 0 0 0 1px rgba(0,0,0,.08)' }}
    >
      <svg viewBox="0 0 22 16" width="18" height="13" preserveAspectRatio="none">{f}</svg>
    </span>
  );
}

function SkillTag({ name, met }) {
  // met === undefined → neutral requirement; true → candidate has it; false → gap.
  const known = met !== undefined;
  const has = met === true;
  return (
    <span
      style={{
        display: 'inline-flex', alignItems: 'center', gap: '5px',
        fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-2xs)', fontWeight: 'var(--fw-medium)',
        padding: '3px 9px', borderRadius: 'var(--radius-pill)', whiteSpace: 'nowrap',
        border: '1px solid',
        ...(has
          // a met skill is "good news" — success-soft, not accent (the accent is
          // reserved for the card's single primary CTA)
          ? { background: 'var(--success-soft)', borderColor: 'var(--success-border)', color: 'var(--success-strong)' }
          : known
          ? { background: 'transparent', borderColor: 'var(--border-strong)', color: 'var(--text-soft)' }
          : { background: 'var(--surface-sunk)', borderColor: 'var(--border)', color: 'var(--text-muted)' }),
      }}
    >
      {known && <Icon name={has ? 'check' : 'x'} size={11} />}
      {name}
    </span>
  );
}

export function PositionCard({
  title,
  company,
  logo,
  location,
  country,
  source,
  origin = 'source',
  pensum,
  salary,
  posted,
  skills = [],
  match,
  status,
  applyLabel,
  onApply,
  onView,
  selected = false,
  onClick,
  style = {},
  ...rest
}) {
  const [hover, setHover] = React.useState(false);
  const matched = match != null;
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'flex', flexDirection: 'column', gap: '14px',
        padding: '18px 20px',
        background: 'var(--surface-card)',
        border: `1px solid ${selected ? 'var(--accent-border)' : 'var(--border)'}`,
        borderRadius: 'var(--radius-lg)',
        boxShadow: hover || selected ? 'var(--shadow-md)' : 'var(--shadow-sm)',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'box-shadow var(--dur-fast) var(--ease-out), border-color var(--dur-fast)',
        ...style,
      }}
      {...rest}
    >
      {/* header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '13px' }}>
        <EntityTile type="company" name={company} src={logo} size="lg" />
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--fs-lg)', fontWeight: 'var(--fw-semibold)', color: 'var(--text-heading)', letterSpacing: 'var(--ls-tight)', lineHeight: 1.25 }}>
            {title}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginTop: '3px', minWidth: 0 }}>
            <span style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {company}{location ? ` · ${location}` : ''}
            </span>
            {country && <Flag country={country} />}
          </div>
        </div>
        {matched ? (
          <MatchIndicator value={match} variant="chip" />
        ) : status ? (
          <StatusBadge status={status} size="sm" />
        ) : null}
      </div>

      {/* meta row — source + Pensum + salary + posted. Mono, the data signals.
         A manually-created posting wears a dashed "Manuell erstellt" badge so
         its provenance is unmistakable next to board-sourced postings. */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '7px' }}>
        {origin === 'manual' && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-2xs)', fontWeight: 'var(--fw-semibold)', color: 'var(--ink-700)', background: 'var(--surface-sunk)', border: '1px dashed var(--text-soft)', borderRadius: 'var(--radius-pill)', padding: '3px 9px' }}>
            <Icon name="edit" size={12} />Created manually
          </span>
        )}
        {source && <MetaPill icon="search">{source}</MetaPill>}
        {pensum && <MetaPill icon="briefcase">{pensum}</MetaPill>}
        {salary && <MetaPill icon="tag">{salary}</MetaPill>}
        {posted && <MetaPill icon="clock">{posted}</MetaPill>}
      </div>

      {/* skills */}
      {skills.length > 0 && (
        <div>
          {matched && (
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-3xs)', letterSpacing: 'var(--ls-wide)', textTransform: 'uppercase', color: 'var(--text-soft)', marginBottom: '8px' }}>
              Skill match
            </div>
          )}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {skills.map((s, i) => (
              <SkillTag key={i} name={typeof s === 'string' ? s : s.name} met={typeof s === 'string' ? undefined : s.met} />
            ))}
          </div>
        </div>
      )}

      {/* actions */}
      {(onView || onApply) && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '2px', paddingTop: '14px', borderTop: '1px solid var(--border)' }}>
          {onView && (
            <button
              onClick={(e) => { e.stopPropagation(); onView(); }}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', fontFamily: 'var(--font-body)', fontSize: 'var(--fs-sm)', fontWeight: 'var(--fw-medium)', color: 'var(--text-muted)', background: 'transparent', border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-md)', padding: '8px 13px', cursor: 'pointer' }}
            >
              <Icon name="fileText" size={15} />Job description
            </button>
          )}
          {onApply && (
            <button
              onClick={(e) => { e.stopPropagation(); onApply(); }}
              style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: '7px', fontFamily: 'var(--font-body)', fontSize: 'var(--fs-sm)', fontWeight: 'var(--fw-semibold)', color: 'var(--accent-contrast)', background: 'var(--accent)', border: '1px solid var(--accent)', borderRadius: 'var(--radius-md)', padding: '8px 15px', cursor: 'pointer' }}
            >
              {applyLabel || 'Apply candidate'}<Icon name="arrowRight" size={15} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
