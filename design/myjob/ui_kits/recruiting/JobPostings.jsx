/* JobPostings.jsx — gespeicherte Stellen ("Stellen", ADR-0058).

   Drei Einstiege fließen hier zusammen: übernehmen aus der Live-Suche
   (Matching.jsx), einfügen per Text und einfügen per URL (SSRF-geschützt).
   Liste (durchsuchbar), Detailansicht (voller Text, "Text ergänzen" bei
   `descriptionIncomplete`) und Löschen mit Undo (#200). Es gibt keine
   Beispieldaten — leere/fehlerhafte Zustände bleiben ehrlich leer. */
const A = window.MyJobDesignSystem_5611b7;
const React = window.React;

const FIELD = {
  flex: 1,
  minWidth: 0,
  border: '1px solid var(--border-strong)',
  outline: 'none',
  background: 'var(--surface-card)',
  borderRadius: 'var(--radius-md)',
  fontFamily: 'var(--font-body)',
  fontSize: '13px',
  color: 'var(--text-heading)',
  padding: '9px 11px',
};

function FieldLabel({ children }) {
  return (
    <label
      style={{
        display: 'block',
        fontFamily: 'var(--font-mono)',
        fontSize: '10px',
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        color: 'var(--text-soft)',
        marginBottom: '5px',
      }}
    >
      {children}
    </label>
  );
}

/* ---------- "Stelle einfügen" (Text / URL) ---------- */
function InsertDialog({ onClose, onSaved }) {
  const [mode, setMode] = React.useState('text');
  const [text, setText] = React.useState('');
  const [url, setUrl] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState(null); // { code, message }
  const [draft, setDraft] = React.useState(null); // editable extract preview

  const extract = async () => {
    setError(null);
    setBusy(true);
    try {
      // AK-0.6: refuse the AI call before it is sent when the server has no key.
      if (!(await window.RecruitApi.aiConfigured())) {
        setError({ code: 'ai-not-configured', message: window.RecruitApi.AI_NOT_CONFIGURED || 'KI nicht eingerichtet.' });
        return;
      }
      const d = await window.RecruitApi.extractJobPosting(mode === 'text' ? { text } : { url });
      setDraft({ company: d.company || '', title: d.title || '', location: d.location || '', country: d.country || '', requirements: Array.isArray(d.requirements) ? d.requirements : [], description: d.description || '', source: d.source || mode, url: d.url });
    } catch (err) {
      setError({ code: err.code || 'unknown', message: err.message || 'Extraktion fehlgeschlagen.' });
    } finally {
      setBusy(false);
    }
  };

  const save = async () => {
    setError(null);
    setBusy(true);
    try {
      const result = await window.RecruitApi.createJobPosting(draft);
      if (result && result.alreadySaved) {
        // A duplicate URL/source already existed — surface it, then open it.
        if (onSaved) onSaved(result.jobPosting && result.jobPosting.id);
      } else if (onSaved) {
        onSaved();
      }
      onClose();
    } catch (err) {
      setError({ code: err.code || 'unknown', message: err.message || 'Speichern fehlgeschlagen.' });
    } finally {
      setBusy(false);
    }
  };

  const errorMessage = error
    ? error.code === 'ssrf-blocked'
      ? 'Diese Adresse ist nicht erlaubt — die Seite zielt auf ein internes Netzwerk.'
      : error.code === 'no-text'
        ? 'Bitte Anzeigentext einfügen — auf dieser Seite war kein Anzeigentext zu finden.'
        : error.message
    : null;

  const tabStyle = (m) => ({
    appearance: 'none',
    cursor: 'pointer',
    border: 'none',
    background: mode === m ? 'var(--accent)' : 'transparent',
    color: mode === m ? 'var(--accent-contrast)' : 'var(--text-muted)',
    borderRadius: 'var(--radius-pill)',
    fontFamily: 'var(--font-mono)',
    fontSize: '12px',
    fontWeight: 600,
    padding: '6px 14px',
  });

  return (
    <A.Card>
      <div style={{ padding: '22px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', marginBottom: '18px' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 700, color: 'var(--text-heading)', margin: 0, letterSpacing: '-0.01em' }}>Stelle einfügen</h2>
          <A.IconButton icon="x" label="Schließen" aria-label="Schließen" variant="ghost" size="sm" onClick={onClose} />
        </div>

        <div style={{ display: 'flex', gap: '8px', marginBottom: '18px' }}>
          <button type="button" onClick={() => setMode('text')} style={tabStyle('text')}>Text einfügen</button>
          <button type="button" onClick={() => setMode('url')} style={tabStyle('url')}>Von URL</button>
        </div>

        {!draft && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {mode === 'text' ? (
              <>
                <FieldLabel>Anzeigentext</FieldLabel>
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Anzeigentext hier einfügen …"
                  aria-label="Anzeigentext"
                  rows={8}
                  style={{ ...FIELD, fontFamily: 'var(--font-mono)', fontSize: '12.5px', resize: 'vertical' }}
                />
              </>
            ) : (
              <>
                <FieldLabel>URL der Stellenanzeige</FieldLabel>
                <input
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://example.com/job/123"
                  aria-label="URL der Stellenanzeige"
                  style={FIELD}
                />
              </>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <A.Button variant="primary" size="sm" onClick={extract} disabled={busy}>
                {busy ? 'Extrahiere …' : 'Felder extrahieren'}
              </A.Button>
            </div>
          </div>
        )}

        {draft && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <FieldLabel>Extrahierte Felder (editierbar)</FieldLabel>
            <input value={draft.company} onChange={(e) => setDraft((s) => ({ ...s, company: e.target.value }))} placeholder="Unternehmen" aria-label="Unternehmen" style={FIELD} />
            <input value={draft.title} onChange={(e) => setDraft((s) => ({ ...s, title: e.target.value }))} placeholder="Stelle" aria-label="Stelle" style={FIELD} />
            <input value={draft.location} onChange={(e) => setDraft((s) => ({ ...s, location: e.target.value }))} placeholder="Ort" aria-label="Ort" style={FIELD} />
            <input value={draft.country} onChange={(e) => setDraft((s) => ({ ...s, country: e.target.value }))} placeholder="Land" aria-label="Land" style={FIELD} />
            <input
              value={draft.requirements.join(', ')}
              onChange={(e) => setDraft((s) => ({ ...s, requirements: e.target.value.split(',').map((r) => r.trim()).filter(Boolean) }))}
              placeholder="Anforderungen, kommasepariert"
              aria-label="Anforderungen"
              style={FIELD}
            />
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <A.Button variant="ghost" size="sm" onClick={() => setDraft(null)}>Zurück</A.Button>
              <A.Button variant="primary" size="sm" onClick={save} disabled={busy || !draft.title.trim() || !draft.company.trim()}>
                {busy ? 'Speichere …' : 'Speichern'}
              </A.Button>
            </div>
          </div>
        )}

        {errorMessage && (
          <div role="alert" style={{ marginTop: '14px', padding: '10px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--danger)', background: 'var(--danger-soft, rgba(200,50,50,0.08))', fontSize: '12.5px', color: 'var(--danger)' }}>
            {errorMessage}
          </div>
        )}
      </div>
    </A.Card>
  );
}

/* ---------- Mandant-Picker: "Bewerbung erstellen" → Mandant wählen ---------- */
function MandantPicker({ posting, onClose, onOpenApplication }) {
  const [talents, setTalents] = React.useState(null); // null = loading
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState(null);

  React.useEffect(() => {
    let alive = true;
    window.RecruitApi.listTalents()
      .then((list) => { if (alive) setTalents(Array.isArray(list) ? list : []); })
      .catch(() => { if (alive) setTalents([]); });
    return () => { alive = false; };
  }, []);

  const pick = async (talent) => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const result = await window.RecruitApi.createJobApplication({
        jobPostingId: posting.id,
        talentId: talent.id,
      });
      // New (alreadyExisting: false) or existing (true) → open the editor (AK-2.2).
      onOpenApplication(result.jobApplication);
    } catch (e) {
      setError((e && e.message) || 'Die Bewerbung konnte nicht erstellt werden.');
      setBusy(false);
    }
  };

  return (
    <window.ModalShell title="Bewerbung erstellen" subtitle={`${posting.company} · ${posting.title} — Mandant:in wählen`} onClose={onClose}>
      {talents === null ? (
        <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-soft)' }}>Lade Mandanten…</div>
      ) : talents.length === 0 ? (
        <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-soft)' }}>
          Noch keine Mandanten angelegt. Lege zuerst unter „Mandanten“ einen Mandanten an.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {talents.map((t) => (
            <button
              key={t.id}
              onClick={() => pick(t)}
              disabled={busy}
              style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: busy ? 'default' : 'pointer', border: '1px solid var(--border-strong)', background: 'var(--surface-card)', borderRadius: 'var(--radius-md)', padding: '10px 13px', fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--text-heading)', textAlign: 'left' }}
            >
              <A.Avatar name={t.name} src={t.src} size="xs" />
              <span style={{ flex: 1 }}>{t.name}</span>
              {t.role && <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-soft)' }}>{t.role}</span>}
            </button>
          ))}
        </div>
      )}
      {error && (
        <div role="alert" style={{ marginTop: '12px', padding: '10px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--danger)', background: 'var(--danger-soft, rgba(200,50,50,0.08))', fontSize: '12.5px', color: 'var(--danger)' }}>
          {error}
        </div>
      )}
    </window.ModalShell>
  );
}

/* ---------- Detailansicht (voller Text, "Text ergänzen", löschen) ---------- */
function Detail({ posting, onBack, onDeleted, onChanged, onOpenApplication }) {
  const [editing, setEditing] = React.useState(false);
  const [description, setDescription] = React.useState(posting.description);
  const [pickingMandant, setPickingMandant] = React.useState(false);

  const saveText = async () => {
    await window.RecruitApi.updateJobPosting(posting.id, { description });
    setEditing(false);
    if (onChanged) onChanged();
  };

  const remove = () => {
    if (onDeleted) onDeleted(posting);
    else {
      window.UndoDelete.schedule({
        label: `Stelle ${posting.title || ''} entfernt`,
        commit: () => window.RecruitApi.deleteJobPosting(posting.id).then(() => onChanged && onChanged()).catch(() => onChanged && onChanged()),
        restore: () => onChanged && onChanged(),
      });
    }
  };

  return (
    <A.Card>
      <div style={{ padding: '22px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px', marginBottom: '6px' }}>
          <A.IconButton icon="arrowLeft" label="Zurück" aria-label="Zurück" variant="ghost" size="sm" onClick={onBack} />
          <div style={{ display: 'flex', gap: '8px' }}>
            <A.IconButton icon="trash" label="Löschen" aria-label="Löschen" variant="ghost" size="sm" onClick={remove} />
          </div>
        </div>

        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '20px', fontWeight: 700, color: 'var(--text-heading)', margin: '8px 0 4px', letterSpacing: '-0.01em' }}>{posting.title}</h2>
        <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{posting.company}</div>

        <div style={{ display: 'flex', gap: '8px', margin: '14px 0', flexWrap: 'wrap', alignItems: 'center' }}>
          <A.Button variant="primary" size="sm" iconLeft={<A.Icon name="send" size={15} />} onClick={() => setPickingMandant(true)}>
            Bewerbung erstellen
          </A.Button>
        </div>

        <div style={{ display: 'flex', gap: '8px', margin: '14px 0', flexWrap: 'wrap' }}>
          {posting.location && <A.MetaPill icon="pin">{posting.location}</A.MetaPill>}
          {posting.country && <A.MetaPill icon="globe">{posting.country}</A.MetaPill>}
          <A.MetaPill icon="briefcase">{posting.source}</A.MetaPill>
        </div>

        {posting.requirements && posting.requirements.length > 0 && (
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '14px' }}>
            {posting.requirements.map((r, i) => <A.Badge key={i} variant="outline" size="sm">{r}</A.Badge>)}
          </div>
        )}

        <div style={{ borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
          {editing ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <FieldLabel>Anzeigentext</FieldLabel>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={10} aria-label="Anzeigentext" style={{ ...FIELD, resize: 'vertical' }} />
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <A.Button variant="ghost" size="sm" onClick={() => setEditing(false)}>Abbrechen</A.Button>
                <A.Button variant="primary" size="sm" onClick={saveText}>Speichern</A.Button>
              </div>
            </div>
          ) : posting.description ? (
            <p style={{ fontSize: '13.5px', lineHeight: 1.7, color: 'var(--text-body)', whiteSpace: 'pre-wrap', margin: 0 }}>{posting.description}</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'flex-start' }}>
              <div style={{ fontSize: '13px', color: 'var(--text-soft)' }}>Diese Quelle lieferte keinen vollständigen Anzeigentext.</div>
              <A.Button variant="secondary" size="sm" onClick={() => setEditing(true)}>Text ergänzen</A.Button>
            </div>
          )}

          {!editing && posting.description && posting.descriptionIncomplete && (
            <div style={{ marginTop: '12px' }}>
              <A.Button variant="secondary" size="sm" onClick={() => setEditing(true)}>Text ergänzen</A.Button>
            </div>
          )}
        </div>
      </div>
      {pickingMandant && (
        <MandantPicker
          posting={posting}
          onClose={() => setPickingMandant(false)}
          onOpenApplication={(application) => {
            setPickingMandant(false);
            if (onOpenApplication) onOpenApplication(application);
          }}
        />
      )}
    </A.Card>
  );
}

/* ---------- Liste ---------- */
function JobPostings({ postings = [], onSearch, onChanged, focusId, onFocusConsumed, onOpenApplication }) {
  const [query, setQuery] = React.useState('');
  const [selectedId, setSelectedId] = React.useState(null);
  const [insertOpen, setInsertOpen] = React.useState(false);
  const [hiddenIds, setHiddenIds] = React.useState(() => new Set());

  // A caller asked to open one specific posting (e.g. "Bereits gespeichert →
  // öffnen" from Matching). Honour it once, then release the focus.
  React.useEffect(() => {
    if (focusId) {
      setSelectedId(focusId);
      if (onFocusConsumed) onFocusConsumed();
    }
  }, [focusId, onFocusConsumed]);

  const visible = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = postings.filter((p) => !hiddenIds.has(p.id));
    if (!q) return filtered;
    return filtered.filter((p) =>
      [p.company, p.title, p.location, p.description].some((f) => String(f || '').toLowerCase().includes(q)),
    );
  }, [postings, query, hiddenIds]);

  const selected = selectedId ? postings.find((p) => p.id === selectedId) : null;

  if (insertOpen) {
    return (
      <InsertDialog
        onClose={() => setInsertOpen(false)}
        onSaved={(existingId) => {
          setInsertOpen(false);
          if (existingId) setSelectedId(existingId);
          if (onChanged) onChanged();
        }}
      />
    );
  }

  if (selected) {
    return (
      <Detail
        posting={selected}
        onBack={() => setSelectedId(null)}
        onChanged={() => onChanged && onChanged()}
        onOpenApplication={onOpenApplication}
        onDeleted={(posting) => {
          setHiddenIds((s) => new Set(s).add(posting.id));
          setSelectedId(null);
          window.UndoDelete.schedule({
            label: `Stelle ${posting.title || ''} entfernt`,
            commit: () => window.RecruitApi.deleteJobPosting(posting.id).then(() => onChanged && onChanged()).catch(() => onChanged && onChanged()),
            restore: () => {
              setHiddenIds((s) => { const n = new Set(s); n.delete(posting.id); return n; });
              if (onChanged) onChanged();
            },
          });
        }}
      />
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--surface-card)', border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-md)', padding: '0 12px', flex: 1, minWidth: 0 }}>
          <A.Icon name="search" size={15} style={{ color: 'var(--text-soft)' }} />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Gespeicherte Stellen durchsuchen …" aria-label="Stellen durchsuchen" style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--text-heading)', padding: '10px 0' }} />
        </label>
        {onSearch && (
          <A.Button variant="ghost" size="sm" onClick={onSearch}>Stellen finden</A.Button>
        )}
        <A.Button variant="primary" size="sm" iconLeft={<A.Icon name="plus" size={15} />} onClick={() => setInsertOpen(true)}>Stelle einfügen</A.Button>
      </div>

      {visible.length === 0 ? (
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-soft)', border: '1px dashed var(--border-strong)', borderRadius: 'var(--radius-lg)' }}>
          {postings.length === 0 ? 'Noch keine gespeicherten Stellen.' : 'Keine Treffer.'}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
          {visible.map((p) => (
            <A.Card key={p.id} style={{ cursor: 'pointer' }} onClick={() => setSelectedId(p.id)}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px' }}>
                <div>
                  <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '16px', fontWeight: 700, color: 'var(--text-heading)', margin: 0, letterSpacing: '-0.01em' }}>{p.title}</h3>
                  <div style={{ fontSize: '12.5px', color: 'var(--text-muted)', marginTop: '3px' }}>{p.company}</div>
                </div>
                {p.descriptionIncomplete && <A.Badge variant="outline" size="sm">Text ergänzen</A.Badge>}
              </div>
              <div style={{ display: 'flex', gap: '8px', margin: '14px 0', flexWrap: 'wrap' }}>
                {p.location && <A.MetaPill icon="pin">{p.location}</A.MetaPill>}
                <A.MetaPill icon="briefcase">{p.source}</A.MetaPill>
              </div>
              <div style={{ fontSize: '12.5px', color: 'var(--text-soft)', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{p.description || 'Kein Anzeigentext.'}</div>
            </A.Card>
          ))}
        </div>
      )}
    </div>
  );
}

Object.assign(window, { JobPostings });
