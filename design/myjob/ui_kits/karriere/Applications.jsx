/* Bewerbungen — the anti-forget application tracker.
   Every application you SENT: which company, when, what documents, status,
   and a loud "nachfassen" flag when a reply is overdue. Click → detail. */
const AP = window.MyJobDesignSystem_f3658e;
const TODAY = new Date('2026-06-26');

function daysAgo(d) {
  if (!d) return null;
  return Math.round((TODAY - new Date(d)) / 86400000);
}
function fmtDate(d) {
  return new Date(d).toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: 'numeric' });
}
function CompanyTile({ app, size = 40 }) {
  const ini = app.company.split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
  return (
    <div style={{ width: size, height: size, flexShrink: 0, borderRadius: 'var(--radius-md)', background: app.tile, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: size * 0.36 + 'px', letterSpacing: '-0.02em' }}>{ini}</div>
  );
}
function DocChips({ docs }) {
  const { DOC } = window.KarriereData;
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
      {docs.map((c) => (
        <AP.Badge key={c} variant="subtle" size="sm" icon={<AP.Icon name={c === 'mappe' ? 'paperclip' : 'fileText'} size={11} />}>{DOC[c]}</AP.Badge>
      ))}
    </div>
  );
}

function AppRow({ app, onOpen }) {
  const [hover, setHover] = React.useState(false);
  const sent = daysAgo(app.sent);
  const sinceReply = daysAgo(app.lastReply);
  const overdue = app.awaiting && (sinceReply == null || sinceReply >= 10);
  return (
    <div onClick={() => onOpen(app)} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{
        display: 'grid', gridTemplateColumns: 'minmax(0,2.1fr) minmax(0,1.5fr) 130px 120px 28px', alignItems: 'center', gap: '16px',
        padding: '14px 18px', cursor: 'pointer', background: hover ? 'var(--surface-subtle)' : 'transparent',
        borderBottom: '1px solid var(--border)', transition: 'background var(--dur-fast) var(--ease-out)',
      }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '13px', minWidth: 0 }}>
        <CompanyTile app={app} />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '14.5px', fontWeight: 700, color: 'var(--text-heading)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{app.company}</div>
          <div style={{ fontSize: '12.5px', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{app.role}</div>
        </div>
      </div>
      <DocChips docs={app.docs} />
      <div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-body)', fontVariantNumeric: 'tabular-nums' }}>{app.draft ? fmtDate(app.created) : fmtDate(app.sent)}</div>
        {app.draft ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontFamily: 'var(--font-mono)', fontSize: '10.5px', color: 'var(--text-soft)', marginTop: '3px' }}>
            <AP.Icon name="edit" size={11} />erstellt
          </div>
        ) : overdue ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontFamily: 'var(--font-mono)', fontSize: '10.5px', color: 'var(--warning)', marginTop: '3px' }}>
            <AP.Icon name="alert" size={11} />{sinceReply == null ? 'keine Bestätigung' : `${sinceReply} T ohne Antwort`}
          </div>
        ) : (
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10.5px', color: 'var(--text-soft)', marginTop: '3px' }}>vor {sent} Tagen</div>
        )}
      </div>
      {app.draft
        ? <AP.Badge variant="subtle" size="sm" icon={<AP.Icon name="bookmark" size={11} />} style={{ color: 'var(--warning)', borderColor: 'color-mix(in srgb, var(--warning) 40%, transparent)', background: 'var(--warning-soft)' }}>Entwurf</AP.Badge>
        : <AP.StatusBadge status={app.status} label={app.statusLabel} size="sm" />}
      <AP.Icon name="chevronRight" size={16} style={{ color: 'var(--text-soft)' }} />
    </div>
  );
}

function TimelineDot({ ev, last }) {
  const colorByKind = { sent: 'var(--accent)', ack: 'var(--status-new)', interview: 'var(--status-interview)', offer: 'var(--status-offer)', rejected: 'var(--status-rejected)' };
  return (
    <div style={{ display: 'flex', gap: '12px' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: colorByKind[ev.kind] || 'var(--text-soft)', marginTop: '3px', flexShrink: 0 }} />
        {!last && <div style={{ width: '2px', flex: 1, background: 'var(--border)', marginTop: '3px' }} />}
      </div>
      <div style={{ paddingBottom: last ? 0 : '16px' }}>
        <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-heading)' }}>{ev.label}</div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-soft)', marginTop: '2px' }}>{fmtDate(ev.date)}</div>
      </div>
    </div>
  );
}

function DetailPanel({ app, onClose, onMarkSent }) {
  const { DOC } = window.KarriereData;
  const sinceReply = daysAgo(app.lastReply);
  const overdue = app && app.awaiting && (sinceReply == null || sinceReply >= 10);
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 40, display: 'flex', justifyContent: 'flex-end' }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(8,11,18,0.45)', backdropFilter: 'blur(2px)', animation: 'kfade var(--dur-fast) var(--ease-out)' }} />
      <div style={{ position: 'relative', width: '460px', maxWidth: '92vw', height: '100%', background: 'var(--surface-card)', borderLeft: '1px solid var(--border)', boxShadow: 'var(--shadow-lg)', overflowY: 'auto', animation: 'kslide var(--dur-med) var(--ease-out)' }}>
        <div style={{ padding: '22px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
          <CompanyTile app={app} size={52} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '19px', fontWeight: 700, color: 'var(--text-heading)' }}>{app.company}</div>
            <div style={{ fontSize: '13.5px', color: 'var(--text-muted)' }}>{app.role}</div>
            <div style={{ display: 'flex', gap: '8px', marginTop: '8px', flexWrap: 'wrap' }}>
              {app.draft
                ? <AP.Badge variant="subtle" size="sm" icon={<AP.Icon name="bookmark" size={11} />} style={{ color: 'var(--warning)', borderColor: 'color-mix(in srgb, var(--warning) 40%, transparent)', background: 'var(--warning-soft)' }}>Entwurf · nicht gesendet</AP.Badge>
                : <AP.StatusBadge status={app.status} label={app.statusLabel} size="sm" />}
              <AP.MetaPill icon="pin">{app.location}</AP.MetaPill>
            </div>
          </div>
          <AP.IconButton icon="x" label="Schließen" variant="ghost" onClick={onClose} />
        </div>

        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {app.draft && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '14px 16px', borderRadius: 'var(--radius-md)', background: 'var(--accent-soft)', border: '1px solid var(--accent-border)' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                <AP.Icon name="info" size={17} style={{ color: 'var(--accent-strong)', flexShrink: 0, marginTop: '1px' }} />
                <div style={{ fontSize: '12.5px', color: 'var(--text-body)', flex: 1 }}>Jedes Unternehmen hat seine eigene Bewerbungsseite. Öffne sie, bewirb dich dort manuell — und markiere die Bewerbung danach als gesendet.</div>
              </div>
              {app.applyUrl && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 12px', borderRadius: 'var(--radius-sm)', background: 'var(--surface-card)', border: '1px solid var(--border)' }}>
                  <AP.Icon name={app.applyVia === 'E-Mail' ? 'mail' : app.applyVia === 'LinkedIn Easy Apply' ? 'linkedin' : 'globe'} size={15} style={{ color: 'var(--accent)' }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '9.5px', letterSpacing: 'var(--ls-wide)', textTransform: 'uppercase', color: 'var(--text-soft)' }}>{app.applyVia}</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-heading)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{app.applyUrl}</div>
                  </div>
                </div>
              )}
              <div style={{ display: 'flex', gap: '8px' }}>
                <AP.Button size="sm" variant="primary" iconLeft={<AP.Icon name="external" size={13} />} onClick={() => app.applyUrl && window.open((app.applyVia === 'E-Mail' ? 'mailto:' : 'https://') + app.applyUrl, '_blank')}>Zur Bewerbungsseite</AP.Button>
                <AP.Button size="sm" variant="outline" iconLeft={<AP.Icon name="check" size={13} />} onClick={() => onMarkSent && onMarkSent(app.id)}>Als gesendet markieren</AP.Button>
              </div>
            </div>
          )}
          {overdue && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 14px', borderRadius: 'var(--radius-md)', background: 'var(--warning-soft)', border: '1px solid color-mix(in srgb, var(--warning) 35%, transparent)' }}>
              <AP.Icon name="alert" size={17} style={{ color: 'var(--warning)' }} />
              <div style={{ fontSize: '12.5px', color: 'var(--text-body)', flex: 1 }}>{sinceReply == null ? 'Kein Eingang bestätigt — Versand prüfen und nachfassen.' : `Seit ${sinceReply} Tagen keine Rückmeldung. Zeit nachzufassen.`}</div>
              <AP.Button size="sm" variant="primary" iconLeft={<AP.Icon name="send" size={13} />}>Nachfassen</AP.Button>
            </div>
          )}

          <section>
            <h4 style={{ fontFamily: 'var(--font-mono)', fontSize: '10.5px', letterSpacing: 'var(--ls-wide)', textTransform: 'uppercase', color: 'var(--text-soft)', margin: '0 0 12px' }}>{app.draft ? 'Ausgewählte Unterlagen' : 'Gesendete Unterlagen'}</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {app.docs.map((c) => (
                <div key={c} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'var(--surface-subtle)' }}>
                  <AP.Icon name={c === 'mappe' ? 'paperclip' : 'fileText'} size={16} style={{ color: 'var(--accent)' }} />
                  <span style={{ flex: 1, fontSize: '13px', color: 'var(--text-body)', fontWeight: 500 }}>{DOC[c]}</span>
                  <AP.Icon name="check" size={15} style={{ color: 'var(--success)' }} strokeWidth={2.4} />
                </div>
              ))}
            </div>
          </section>

          <section style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <Field label={app.draft ? 'Erstellt am' : 'Gesendet am'} value={fmtDate(app.draft ? app.created : app.sent)} />
            <Field label="Kanal" value={`${app.channel} · ${app.via}`} />
            <Field label="Gehaltswunsch" value={app.salaryAsked} mono />
            <Field label="Ansprechpartner" value={app.recruiter ? app.recruiter.name : '—'} />
          </section>

          {app.nextStep && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 14px', borderRadius: 'var(--radius-md)', background: 'var(--accent-soft)', border: '1px solid var(--accent-border)' }}>
              <AP.Icon name="calendar" size={16} style={{ color: 'var(--accent-strong)' }} />
              <span style={{ fontSize: '12.5px', color: 'var(--text-body)', fontWeight: 500 }}>{app.nextStep}</span>
            </div>
          )}

          <section>
            <h4 style={{ fontFamily: 'var(--font-mono)', fontSize: '10.5px', letterSpacing: 'var(--ls-wide)', textTransform: 'uppercase', color: 'var(--text-soft)', margin: '0 0 14px' }}>Verlauf</h4>
            {app.timeline.map((ev, i) => <TimelineDot key={i} ev={ev} last={i === app.timeline.length - 1} />)}
          </section>

          <section>
            <h4 style={{ fontFamily: 'var(--font-mono)', fontSize: '10.5px', letterSpacing: 'var(--ls-wide)', textTransform: 'uppercase', color: 'var(--text-soft)', margin: '0 0 8px' }}>Notiz</h4>
            <p style={{ fontSize: '13px', lineHeight: 1.6, color: 'var(--text-body)', margin: 0 }}>{app.notes}</p>
          </section>

          <div style={{ display: 'flex', gap: '10px' }}>
            <AP.Button variant="outline" size="sm" iconLeft={<AP.Icon name="edit" size={14} />}>Status ändern</AP.Button>
            <AP.Button variant="ghost" size="sm" iconLeft={<AP.Icon name="external" size={14} />}>Stelle öffnen</AP.Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, mono }) {
  return (
    <div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: 'var(--ls-wide)', textTransform: 'uppercase', color: 'var(--text-soft)', marginBottom: '4px' }}>{label}</div>
      <div style={{ fontFamily: mono ? 'var(--font-mono)' : 'var(--font-body)', fontSize: '13.5px', fontWeight: 600, color: 'var(--text-heading)' }}>{value}</div>
    </div>
  );
}

function Bewerbungen({ apps, openId, onOpen, onClose, onMarkSent, onFindJobs }) {
  const APPLICATIONS = apps || window.KarriereData.APPLICATIONS;
  const [tab, setTab] = React.useState('alle');
  const [q, setQ] = React.useState('');
  const awaiting = APPLICATIONS.filter((a) => a.awaiting);
  const drafts = APPLICATIONS.filter((a) => a.draft);
  const filtered = APPLICATIONS.filter((a) => {
    if (tab === 'entwurf' && !a.draft) return false;
    if (tab === 'offen' && !a.awaiting) return false;
    if (tab === 'aktiv' && !['interview', 'offer', 'review', 'new'].includes(a.status)) return false;
    if (tab === 'fertig' && !['rejected', 'hired'].includes(a.status)) return false;
    if (q && !(a.company + a.role).toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });
  const openApp = APPLICATIONS.find((a) => a.id === openId);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', maxWidth: '1100px' }}>
      {drafts.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 18px', borderRadius: 'var(--radius-lg)', background: 'var(--accent-soft)', border: '1px solid var(--accent-border)' }}>
          <span style={{ width: '34px', height: '34px', borderRadius: 'var(--radius-md)', background: 'var(--accent)', color: 'var(--accent-contrast)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><AP.Icon name="bookmark" size={18} /></span>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '14px', color: 'var(--text-heading)' }}>{drafts.length} vorgemerkte {drafts.length === 1 ? 'Bewerbung' : 'Bewerbungen'}</div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Erstellt, aber noch nicht gesendet. Öffnen → „Als gesendet markieren“, sobald du sie abgeschickt hast.</div>
          </div>
          <AP.Button size="sm" variant="outline" onClick={() => setTab('entwurf')}>Anzeigen</AP.Button>
        </div>
      )}
      {awaiting.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 18px', borderRadius: 'var(--radius-lg)', background: 'var(--warning-soft)', border: '1px solid color-mix(in srgb, var(--warning) 32%, transparent)' }}>
          <span style={{ width: '34px', height: '34px', borderRadius: 'var(--radius-md)', background: 'var(--warning)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><AP.Icon name="alert" size={18} /></span>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '14px', color: 'var(--text-heading)' }}>{awaiting.length} Bewerbungen warten auf Antwort</div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Damit du keine vergisst: hier nachfassen, sobald es zu lange still ist.</div>
          </div>
          <AP.Button size="sm" variant="ink" onClick={() => setTab('offen')}>Anzeigen</AP.Button>
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: '200px' }}>
          <AP.Tabs value={tab} onChange={setTab} tabs={[
            { id: 'alle', label: 'Alle', count: APPLICATIONS.length },
            { id: 'entwurf', label: 'Entwürfe', count: drafts.length },
            { id: 'offen', label: 'Antwort offen', count: awaiting.length },
            { id: 'aktiv', label: 'Aktiv' },
            { id: 'fertig', label: 'Abgeschlossen' },
          ]} />
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--surface-card)', border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-md)', padding: '0 11px', width: '210px' }}>
          <AP.Icon name="search" size={15} style={{ color: 'var(--text-soft)' }} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Firma oder Rolle …" style={{ flex: 1, minWidth: 0, border: 'none', outline: 'none', background: 'transparent', fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--text-heading)', padding: '9px 0' }} />
        </label>
        <AP.Button variant="primary" iconLeft={<AP.Icon name="search" size={15} />} onClick={onFindJobs}>Jobs finden</AP.Button>
      </div>

      <AP.Card pad={false}>
        {filtered.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-soft)', fontSize: '13px' }}>Keine Bewerbungen in dieser Ansicht.</div>
        ) : filtered.map((a) => <AppRow key={a.id} app={a} onOpen={() => onOpen(a.id)} />)}
      </AP.Card>

      {openApp && <DetailPanel app={openApp} onClose={onClose} onMarkSent={onMarkSent} />}
    </div>
  );
}

Object.assign(window, { KBewerbungen: Bewerbungen });
