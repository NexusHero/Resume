/* AssistantView — the agent's home: a master switch, the autonomy mode, and
   the review queue. The assistant runs server-side on a schedule (also while
   nobody is signed in); everything it finds lands here as a suggestion with a
   rationale and Accept/Dismiss — the same staged-change contract as the
   editor's AI banner. In mode "act" the internal, reversible actions are
   applied directly and show up as auto-applied. */
const AV = window.MyJobDesignSystem_5611b7;

const AV_KIND_LABELS = {
  'shortlist-add': 'Shortlist',
  'follow-up': 'Follow-up',
  'data-gap': 'Data gap',
  application: 'Application',
};
const AV_STATUS_LABELS = {
  accepted: 'angenommen',
  dismissed: 'verworfen',
  'auto-applied': 'automatisch angewendet',
  autoApplied: 'automatisch angewendet',
};
const AV_KIND_COLORS = {
  'shortlist-add': 'var(--accent-strong)',
  'follow-up': 'var(--warning-strong, #8a6d00)',
  'data-gap': 'var(--text-soft)',
  application: 'var(--accent-strong)',
};

function AvCard({ children, style }) {
  return (
    <div style={{ background: 'var(--surface-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-sm)', padding: '20px 22px', ...style }}>
      {children}
    </div>
  );
}

function AvModePill({ active, onClick, label, hint }) {
  return (
    <button onClick={onClick} title={hint} style={{ flex: 1, padding: '8px 10px', border: 'none', cursor: 'pointer', borderRadius: 'var(--radius-sm)', fontFamily: 'var(--font-mono)', fontSize: '11px', fontWeight: 600, background: active ? 'var(--surface-card)' : 'transparent', color: active ? 'var(--text-heading)' : 'var(--text-soft)', boxShadow: active ? 'var(--shadow-xs)' : 'none' }}>
      {label}
    </button>
  );
}

function AssistantView({ onChanged }) {
  const { isMobile } = useViewport();
  const [settings, setSettings] = React.useState(null); // null = loading
  const [counts, setCounts] = React.useState({});
  const [queue, setQueue] = React.useState([]);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState(false);
  const [lastRun, setLastRun] = React.useState(null); // result of a manual run

  const load = React.useCallback(() => {
    Promise.all([window.RecruitApi.getAssistant(), window.RecruitApi.listAssistantSuggestions()])
      .then(([overview, suggestions]) => {
        setSettings(overview.settings);
        setCounts(overview.counts);
        setQueue(suggestions);
        setError(false);
      })
      .catch(() => setError(true));
  }, []);
  React.useEffect(load, [load]);

  const patch = (p) => {
    if (busy) return;
    setBusy(true);
    window.RecruitApi.updateAssistant(p)
      .then((r) => setSettings(r.settings))
      .catch(() => {})
      .finally(() => setBusy(false));
  };
  const runNow = () => {
    if (busy) return;
    setBusy(true);
    setLastRun(null);
    window.RecruitApi.runAssistant()
      .then((r) => { setLastRun(r); load(); if (onChanged) onChanged(); })
      .catch(() => {})
      .finally(() => setBusy(false));
  };
  const resolve = (id, action) => {
    window.RecruitApi.resolveAssistantSuggestion(id, action)
      .then(() => { load(); if (action === 'accept' && onChanged) onChanged(); })
      .catch(() => {});
  };

  if (error) return <AvCard><div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-soft)', fontSize: '13px' }}>Der Assistent konnte nicht geladen werden. Bitte lade die Seite neu.</div></AvCard>;
  if (settings === null) return <AvCard><div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-soft)', fontSize: '13px' }}>Lädt…</div></AvCard>;

  const proposed = queue.filter((s) => s.status === 'proposed');
  const resolved = queue.filter((s) => s.status !== 'proposed').slice(0, 12);
  const fmtWhen = (iso) => (iso ? new Date(iso).toLocaleString('en-GB') : 'nie');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Control card: switch, mode, cadence, run now */}
      <AvCard>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 320px', minWidth: 0 }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 700, color: 'var(--text-heading)', margin: 0 }}>CoRecruiter</h2>
            <div style={{ fontSize: '12.5px', color: 'var(--text-soft)', marginTop: '4px', lineHeight: 1.55 }}>
              Erstellt Shortlists von Kandidat:innen für aktive Mandate, markiert stockende Pipeline-Karten und
              leere Profile — und baut auf <strong>Autopilot</strong> vollständige Bewerbungen (maßgeschneiderter
              Lebenslauf + Anschreiben + Bewerbungsmappe) für starke Matches. Läuft im Hintergrund auf dem Server —
              auch während du abgemeldet bist — und legt alles hier zur Prüfung bereit. Er versendet nie etwas und löscht nie.
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10.5px', letterSpacing: '0.06em', textTransform: 'uppercase', color: settings.enabled ? 'var(--positive, #1F8A5B)' : 'var(--text-soft)' }}>
              {settings.enabled ? 'An' : 'Aus'}
            </span>
            <AV.Button variant={settings.enabled ? 'outline' : 'primary'} size="sm" disabled={busy} onClick={() => patch({ enabled: !settings.enabled })}>
              {settings.enabled ? 'Ausschalten' : 'Einschalten'}
            </AV.Button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '18px', marginTop: '16px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ flex: '0 1 300px' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-soft)', marginBottom: '6px' }}>Autonomie</div>
            <div style={{ display: 'flex', gap: '4px', background: 'var(--surface-sunk)', borderRadius: 'var(--radius-md)', padding: '4px' }}>
              <AvModePill active={settings.mode === 'suggest'} onClick={() => patch({ mode: 'suggest' })} label="Vorschlagen" hint="Alles wartet auf deine Freigabe." />
              <AvModePill active={settings.mode === 'act'} onClick={() => patch({ mode: 'act' })} label="Handeln" hint="Interne, umkehrbare Aktionen (z. B. ein Match zur Pipeline hinzufügen) werden direkt ausgeführt und als automatisch angewendet markiert. Nichts nach außen Gerichtetes läuft je allein." />
              <AvModePill active={settings.mode === 'autopilot'} onClick={() => patch({ mode: 'autopilot' })} label="Autopilot" hint="Höchste Stufe: Bei starken Matches baut der Assistent die komplette Bewerbung — maßgeschneiderter Lebenslauf + Anschreiben in der Sprache der Anzeige + Bewerbungsmappe — und legt sie hier zur Freigabe mit einem Klick bereit. Er versendet weiterhin nie etwas." />
            </div>
          </div>
          <div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-soft)', marginBottom: '6px' }}>Alle</div>
            <select value={settings.intervalMinutes} disabled={busy} onChange={(e) => patch({ intervalMinutes: Number(e.target.value) })} style={{ padding: '8px 10px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-strong)', background: 'var(--surface-card)', color: 'var(--text-heading)', fontFamily: 'var(--font-mono)', fontSize: '12px' }}>
              <option value={15}>15 Min.</option>
              <option value={60}>Stunde</option>
              <option value={240}>4 Stunden</option>
              <option value={1440}>Tag</option>
            </select>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-soft)' }}>Letzter Lauf: {fmtWhen(settings.lastRunAt)}</span>
            <AV.Button variant="primary" size="sm" disabled={busy || !settings.enabled} iconLeft={<AV.Icon name="zap" size={14} />} onClick={runNow}>Jetzt ausführen</AV.Button>
          </div>
        </div>
        {/* Autopilot-only: where to draw openings from, and how strong a match must be. */}
        {settings.mode === 'autopilot' && (
          <div style={{ display: 'flex', gap: '18px', marginTop: '14px', flexWrap: 'wrap', alignItems: 'flex-end', paddingTop: '14px', borderTop: '1px dashed var(--border)' }}>
            <div style={{ flex: '0 1 260px' }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-soft)', marginBottom: '6px' }}>Bewerben auf</div>
              <div style={{ display: 'flex', gap: '4px', background: 'var(--surface-sunk)', borderRadius: 'var(--radius-md)', padding: '4px' }}>
                <AvModePill active={settings.applySource === 'jobs'} onClick={() => patch({ applySource: 'jobs' })} label="Stellenanzeigen" hint="Stellen von den Jobbörsen." />
                <AvModePill active={settings.applySource === 'mandates'} onClick={() => patch({ applySource: 'mandates' })} label="Eigene Mandate" hint="Deine aktiven Klienten-Mandate." />
              </div>
            </div>
            <div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-soft)', marginBottom: '6px' }}>Min. Match</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input type="number" min="0" max="100" value={settings.minApplyScore} disabled={busy} onChange={(e) => patch({ minApplyScore: Math.max(0, Math.min(100, Number(e.target.value))) })} style={{ width: '64px', padding: '7px 9px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-strong)', background: 'var(--surface-card)', color: 'var(--text-heading)', fontFamily: 'var(--font-mono)', fontSize: '12px' }} />
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-soft)' }}>/ 100</span>
              </div>
            </div>
            <div style={{ flex: '1 1 200px', fontSize: '11.5px', color: 'var(--text-soft)', lineHeight: 1.5 }}>
              Baut pro starkem Match eine vollständige Bewerbung (verbraucht KI-Tokens). Das Versenden bleibt dein Klick.
            </div>
          </div>
        )}
        {lastRun && (
          <div role="status" style={{ marginTop: '12px', fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--positive, #1F8A5B)' }}>
            Lauf abgeschlossen — {lastRun.proposed} vorgeschlagen{lastRun.applied ? `, ${lastRun.applied} automatisch angewendet` : ''}.
          </div>
        )}
      </AvCard>

      {/* Review queue */}
      <AvCard>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '15px', fontWeight: 700, color: 'var(--text-heading)', margin: 0 }}>Zu deiner Prüfung</h3>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-soft)' }}>{proposed.length} offen · {counts.accepted || 0} angenommen · {counts.autoApplied || 0} automatisch angewendet · {counts.dismissed || 0} verworfen</span>
        </div>
        {proposed.length === 0 ? (
          <div style={{ padding: '22px', textAlign: 'center', color: 'var(--text-soft)', fontSize: '13px' }}>
            {settings.enabled ? 'Nichts offen — der Assistent hat keine neue Arbeit gefunden.' : 'Der Assistent ist aus. Schalte ihn ein, dann bereitet er hier Vorschläge vor.'}
          </div>
        ) : (
          <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column' }}>
            {proposed.map((s) => (
              <div key={s.id} style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'stretch' : 'flex-start', gap: '12px', padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
                <span style={{ flexShrink: 0, fontFamily: 'var(--font-mono)', fontSize: '9.5px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: AV_KIND_COLORS[s.kind] || 'var(--text-soft)', border: '1px solid var(--border)', borderRadius: 'var(--radius-pill)', padding: '3px 9px', marginTop: '2px' }}>
                  {AV_KIND_LABELS[s.kind] || s.kind}
                </span>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--text-heading)' }}>{s.title}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-soft)', marginTop: '2px', lineHeight: 1.5 }}>{s.rationale}</div>
                  {s.kind === 'application' && s.payload && (
                    <div style={{ marginTop: '8px', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', background: 'var(--surface-sunk)', padding: '10px 12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '6px' }}>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-soft)' }}>Maßgeschneidertes Paket · {String(s.payload.lang || '').toUpperCase()} · {s.payload.provider === 'template' ? 'Vorlage' : `KI · ${s.payload.provider}`}</span>
                        <a href={window.RecruitApi.assistantDossierUrl(s.id)} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', fontFamily: 'var(--font-mono)', fontSize: '10.5px', fontWeight: 600, color: 'var(--accent-strong)', border: '1px solid var(--accent-border, var(--border-strong))', borderRadius: 'var(--radius-pill)', padding: '3px 10px' }}>Mappe herunterladen (PDF)</a>
                        {Number(s.payload.ungroundedCount) > 0 && (
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10.5px', color: 'var(--danger)' }}>⚠ {s.payload.ungroundedCount} ungeprüfte Angabe(n)</span>
                        )}
                      </div>
                      {s.payload.summary && (
                        <div style={{ fontSize: '12px', color: 'var(--text-body)', lineHeight: 1.5, marginBottom: '6px' }}><strong style={{ color: 'var(--text-heading)' }}>Zusammenfassung:</strong> {s.payload.summary}</div>
                      )}
                      {Array.isArray(s.payload.paragraphs) && s.payload.paragraphs.map((p, i) => (
                        <div key={i} style={{ fontSize: '12px', color: 'var(--text-soft)', lineHeight: 1.5, marginTop: i ? '4px' : 0 }}>{p}</div>
                      ))}
                    </div>
                  )}
                </div>
                <div style={{ flexShrink: 0, display: 'flex', gap: '8px', justifyContent: isMobile ? 'flex-end' : 'flex-start' }}>
                  <AV.Button variant="primary" size="sm" onClick={() => resolve(s.id, 'accept')}>{s.kind === 'application' ? 'Freigeben' : 'Annehmen'}</AV.Button>
                  <AV.Button variant="ghost" size="sm" onClick={() => resolve(s.id, 'dismiss')}>Verwerfen</AV.Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </AvCard>

      {/* Recent activity — what the assistant did (incl. auto-applied) */}
      {resolved.length > 0 && (
        <AvCard>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '15px', fontWeight: 700, color: 'var(--text-heading)', margin: 0 }}>Letzte Aktivität</h3>
          <div style={{ marginTop: '8px' }}>
            {resolved.map((s) => (
              <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                <span style={{ flexShrink: 0, fontFamily: 'var(--font-mono)', fontSize: '9.5px', letterSpacing: '0.06em', textTransform: 'uppercase', color: s.status === 'dismissed' ? 'var(--text-muted)' : 'var(--positive, #1F8A5B)' }}>{AV_STATUS_LABELS[s.status] || s.status}</span>
                <span style={{ fontSize: '12.5px', color: 'var(--text-soft)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.title}</span>
              </div>
            ))}
          </div>
        </AvCard>
      )}
    </div>
  );
}

Object.assign(window, { AssistantView });
