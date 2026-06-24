/* __kit_guard__ */
(function(){ var __s=document.currentScript; if (__s && /_ds_bundle\.js/.test(__s.src||'')) return;
/* CandidateDetail — slide-in panel with full candidate profile + stage actions. */
const D = window.BewerbungstoolDesignSystem_a75119;

function Field({ icon, label, value }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
      <span style={{ width: '30px', height: '30px', flexShrink: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: 'var(--radius-md)', background: 'var(--surface-sunk)', color: 'var(--text-soft)' }}>
        <D.Icon name={icon} size={15} />
      </span>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '9.5px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-soft)' }}>{label}</div>
        <div style={{ fontSize: '13px', color: 'var(--text-heading)', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{value}</div>
      </div>
    </div>
  );
}

function SectionLabel({ icon, children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontFamily: 'var(--font-mono)', fontSize: '10px', fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-soft)', margin: '22px 0 12px' }}>
      <D.Icon name={icon} size={13} />{children}
    </div>
  );
}

function CandidateDetail({ c, onClose, onAdvance, onReject }) {
  if (!c) return null;
  const stageOrder = window.STAGES_ORDER;
  const idx = stageOrder.indexOf(c.status);
  const nextStage = idx >= 0 && idx < stageOrder.length - 1 ? D.STAGES[stageOrder[idx + 1]] : null;
  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(8,11,18,0.42)', backdropFilter: 'blur(2px)', zIndex: 40, animation: 'fadeIn .2s ease' }} />
      <aside style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, width: 'min(480px, 92vw)', zIndex: 41,
        background: 'var(--surface-card)', boxShadow: 'var(--shadow-lg)', display: 'flex', flexDirection: 'column',
        animation: 'slideIn .26s cubic-bezier(0.16,1,0.3,1)',
      }}>
        {/* header */}
        <div style={{ padding: '20px 22px', borderBottom: '1px solid var(--border)', background: 'linear-gradient(165deg, var(--ink-850), var(--ink-900))', color: '#fff' }}>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '6px' }}>
            <D.IconButton icon="x" label="Schließen" variant="glass" size="sm" onClick={onClose} />
          </div>
          <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
            <D.Avatar name={c.name} src={c.src} size={64} radius="var(--radius-lg)" />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '22px', fontWeight: 700, letterSpacing: '-0.02em' }}>{c.name}</div>
              <div style={{ fontSize: '13px', color: 'var(--sidebar-muted)', marginTop: '2px' }}>{c.role}</div>
              <div style={{ display: 'flex', gap: '8px', marginTop: '10px', alignItems: 'center' }}>
                <D.StatusBadge status={c.status} />
                <D.Badge variant="glass" size="sm" icon={<D.Icon name="trend" size={11} />}>{c.score}% Match</D.Badge>
              </div>
            </div>
          </div>
        </div>

        {/* body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 22px' }}>
          <p style={{ fontSize: '13.5px', lineHeight: 1.6, color: 'var(--text-body)', margin: 0 }}>{c.summary}</p>

          <SectionLabel icon="id">Kontakt & Eckdaten</SectionLabel>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <Field icon="mail" label="E-Mail" value={c.email} />
            <Field icon="phone" label="Telefon" value={c.phone} />
            <Field icon="pin" label="Standort" value={c.location} />
            <Field icon="briefcase" label="Beworben auf" value={c.position} />
            <Field icon="trend" label="Gehaltswunsch" value={c.salary} />
            <Field icon="clock" label="Kündigungsfrist" value={c.notice} />
          </div>

          <SectionLabel icon="zap">Skills</SectionLabel>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {c.skills.map((s, i) => <D.Badge key={i} variant={i === 0 ? 'soft' : 'outline'} size="sm">{s}</D.Badge>)}
          </div>

          <SectionLabel icon="fileText">Dokumente</SectionLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {['Lebenslauf.pdf', 'Anschreiben.pdf', 'Zeugnisse.pdf'].map((f, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '11px', padding: '10px 13px', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', background: 'var(--surface-subtle)' }}>
                <span style={{ width: '30px', height: '30px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: 'var(--radius-sm)', background: 'var(--accent-soft)', color: 'var(--accent-strong)' }}><D.Icon name="fileText" size={15} /></span>
                <span style={{ flex: 1, fontSize: '13px', fontWeight: 500, color: 'var(--text-heading)' }}>{f}</span>
                <D.IconButton icon="download" label="Herunterladen" variant="ghost" size="sm" />
              </div>
            ))}
          </div>

          {c.timeline && (
            <>
              <SectionLabel icon="clock">Verlauf</SectionLabel>
              <div style={{ position: 'relative', paddingLeft: '20px' }}>
                <span style={{ position: 'absolute', left: '5px', top: '6px', bottom: '6px', width: '1.5px', background: 'var(--border-strong)' }} />
                {c.timeline.map((e, i) => (
                  <div key={i} style={{ position: 'relative', marginBottom: '14px' }}>
                    <span style={{ position: 'absolute', left: '-19px', top: '3px', width: '10px', height: '10px', borderRadius: '50%', background: i === c.timeline.length - 1 ? 'var(--accent)' : '#fff', border: `2px solid ${i === c.timeline.length - 1 ? 'var(--accent)' : 'var(--border-strong)'}` }} />
                    <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-heading)' }}>{e.t}</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-soft)', marginTop: '1px' }}>{e.d} · {e.who}</div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* footer actions */}
        <div style={{ padding: '14px 22px', borderTop: '1px solid var(--border)', display: 'flex', gap: '10px', background: 'var(--surface-subtle)' }}>
          <D.Button variant="outline" iconLeft={<D.Icon name="x" size={15} />} onClick={() => onReject(c.id)}>Absagen</D.Button>
          {nextStage
            ? <D.Button variant="primary" block iconRight={<D.Icon name="arrowRight" size={15} />} onClick={() => onAdvance(c.id)}>Weiter zu {nextStage.label}</D.Button>
            : <D.Button variant="primary" block iconLeft={<D.Icon name="check" size={15} />} disabled>Eingestellt</D.Button>}
        </div>
      </aside>
    </>
  );
}

Object.assign(window, { CandidateDetail });

})();
