/* BewerbungsEditor — a thin wrapper around the shared Editor (ADR-0059). It is
   NOT a third editor paradigm: the same Editor renders the application's
   **copy** (via the persistence seam) with a reduced toolset, while the wrapper
   adds the two Bewerbung-specific surfaces above it — a status switch and an
   "Anschreiben generieren" action that runs against the posting's full ad text. */
const BE = window.MyJobDesignSystem_5611b7;

const STATUS_LABELS = {
  draft: 'Entwurf',
  sent: 'Versendet',
  interview: 'Gespräch',
  offer: 'Zusage',
  rejected: 'Absage',
};

const STATUS_ORDER = ['draft', 'sent', 'interview', 'offer', 'rejected'];

function BewerbungsEditor({ application, onClose, onChanged }) {
  const { isMobile } = window.useViewport ? window.useViewport() : { isMobile: false };
  const [app, setApp] = React.useState(application);
  const [statusBusy, setStatusBusy] = React.useState(false);
  const [letterSuggestion, setLetterSuggestion] = React.useState(null);
  const [letterBusy, setLetterBusy] = React.useState(false);
  const [letterError, setLetterError] = React.useState(null);
  const [aiReady, setAiReady] = React.useState(null);
  // Bumping this remounts the Editor so it re-loads the copy after a change
  // (e.g. an accepted generated letter) instead of holding stale form state.
  const [reloadToken, setReloadToken] = React.useState(0);

  React.useEffect(() => {
    let alive = true;
    const p =
      window.RecruitApi && window.RecruitApi.aiConfigured
        ? window.RecruitApi.aiConfigured()
        : Promise.resolve(true);
    p.then((ok) => { if (alive) setAiReady(ok); }).catch(() => { if (alive) setAiReady(false); });
    return () => { alive = false; };
  }, []);

  const changeStatus = async (status) => {
    if (statusBusy || status === app.status) return;
    setStatusBusy(true);
    try {
      const updated = await window.RecruitApi.changeJobApplicationStatus(app.id, status);
      setApp(updated);
      if (onChanged) onChanged();
    } catch {
      /* the status pill stays on the persisted value */
    } finally {
      setStatusBusy(false);
    }
  };

  const generateLetter = async () => {
    if (aiReady === false) {
      setLetterError('KI nicht eingerichtet — konfiguriere den zentralen Schlüssel in den Einstellungen.');
      return;
    }
    setLetterBusy(true);
    setLetterError(null);
    setLetterSuggestion(null);
    try {
      const letter = await window.RecruitApi.generateJobApplicationLetter(app.id);
      setLetterSuggestion(letter);
    } catch (e) {
      setLetterError(
        e && e.code === 'ai-not-configured'
          ? 'KI nicht eingerichtet — konfiguriere den zentralen Schlüssel in den Einstellungen.'
          : (e && e.message) || 'Das Anschreiben konnte nicht erstellt werden. Bitte versuche es erneut.',
      );
    } finally {
      setLetterBusy(false);
    }
  };

  const acceptLetter = async () => {
    if (!letterSuggestion) return;
    try {
      const docs = {
        ...app.documents,
        letter: { ...app.documents.letter, absaetze: letterSuggestion.paragraphs },
      };
      const saved = await window.RecruitApi.saveJobApplicationDocuments(app.id, docs);
      setApp((a) => ({ ...a, documents: saved }));
      setLetterSuggestion(null);
      setReloadToken((n) => n + 1);
      if (onChanged) onChanged();
    } catch {
      setLetterError('Das Anschreiben konnte nicht übernommen werden.');
    }
  };

  const talent = {
    id: app.talentId,
    name: app.talentName || (app.documents && app.documents.contact && app.documents.contact.name) || 'Mandant',
    role: (app.documents && app.documents.contact && app.documents.contact.role) || '',
    headline: '',
    email: (app.documents && app.documents.contact && app.documents.contact.email) || '',
    phone: (app.documents && app.documents.contact && app.documents.contact.phone) || '',
    location: (app.documents && app.documents.contact && app.documents.contact.location) || '',
    linkedin: (app.documents && app.documents.contact && app.documents.contact.linkedin) || '',
    src: (app.documents && app.documents.contact && app.documents.contact.photo) || undefined,
  };

  // PDF export (ADR-0059 §6.3): render the **copy** the editor is currently
  // editing, not the talent's stored base. The documents-body dossier-preview
  // endpoint already renders arbitrary content to a PDF blob — no new endpoint
  // and no base-write — so the copy becomes the export source here.
  const exportCopyPdf = async (docs, filename) => {
    const letter = docs && docs.letter ? docs.letter : {};
    const blob = await window.RecruitApi.talentDossierPreviewPdf(app.talentId || 'me', docs, {
      company: letter.firma,
      contactName: letter.ansprechpartner,
      street: letter.strasse,
      postalCodeCity: letter.plzOrt,
      subject: letter.betreff,
    });
    await window.RecruitApi.saveBlob(blob, filename);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: isMobile ? 'auto' : '100%', gap: '14px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
        <button onClick={onClose} style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-muted)', padding: 0 }}>
          <BE.Icon name="arrowLeft" size={14} /> Zurück zu den Bewerbungen
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '16px', fontWeight: 700, color: 'var(--text-heading)' }}>
            {app.postingCompany} · {app.postingTitle}
          </div>
          <div style={{ fontSize: '12.5px', color: 'var(--text-soft)' }}>für {app.talentName || talent.name}</div>
        </div>
        <button onClick={generateLetter} disabled={letterBusy} title={aiReady === false ? 'KI nicht eingerichtet' : undefined} style={{ appearance: 'none', cursor: letterBusy ? 'default' : 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px', border: '1px solid var(--accent-border)', background: 'var(--accent-soft)', color: 'var(--accent-strong)', borderRadius: 'var(--radius-pill)', fontFamily: 'var(--font-mono)', fontSize: '11px', fontWeight: 600, padding: '6px 12px' }}>
          <BE.Icon name="zap" size={13} /> {letterBusy ? 'Erstelle …' : 'Anschreiben generieren'}
        </button>
      </div>

      {aiReady === false && (
        <div role="status" style={{ alignSelf: 'flex-start', fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--danger)', background: 'var(--danger-soft)', border: '1px solid var(--danger)', borderRadius: 'var(--radius-md)', padding: '6px 12px' }}>
          KI nicht eingerichtet — konfiguriere den zentralen Schlüssel in den Einstellungen.
        </div>
      )}

      {/* Status switch — persisted, any transition allowed (AK-4.4 pre-run). */}
      <div style={{ display: 'flex', gap: '4px', background: 'var(--surface-sunk)', borderRadius: 'var(--radius-md)', padding: '4px', alignSelf: 'flex-start', flexWrap: 'wrap' }}>
        {STATUS_ORDER.map((status) => (
          <button
            key={status}
            onClick={() => changeStatus(status)}
            disabled={statusBusy}
            style={{
              border: 'none',
              cursor: statusBusy ? 'default' : 'pointer',
              borderRadius: 'var(--radius-sm)',
              fontFamily: 'var(--font-mono)',
              fontSize: '12px',
              fontWeight: 600,
              padding: isMobile ? '9px 13px' : '5px 12px',
              minHeight: isMobile ? '44px' : undefined,
              background: app.status === status ? 'var(--surface-card)' : 'transparent',
              color: app.status === status ? 'var(--text-heading)' : 'var(--text-soft)',
              boxShadow: app.status === status ? 'var(--shadow-xs)' : 'none',
            }}
          >
            {STATUS_LABELS[status]}
          </button>
        ))}
      </div>

      {letterError && (
        <div role="alert" style={{ alignSelf: 'flex-start', fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--danger)', background: 'var(--danger-soft)', border: '1px solid var(--danger)', borderRadius: 'var(--radius-md)', padding: '6px 12px' }}>
          {letterError}
        </div>
      )}

      {letterSuggestion && (
        <div style={{ border: '1px dashed var(--accent-border)', borderRadius: 'var(--radius-md)', overflow: 'hidden', alignSelf: 'stretch' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '8px 12px', background: 'var(--accent-soft)', fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 600, color: 'var(--accent-strong)' }}>
            <BE.Icon name="zap" size={12} />Anschreiben-Vorschlag · noch nicht übernommen
            {letterSuggestion.provider && (
              <span style={{ marginLeft: 'auto' }}><window.ProviderBadge provider={letterSuggestion.provider} usage={letterSuggestion.usage} /></span>
            )}
          </div>
          <div style={{ padding: '12px 13px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {(letterSuggestion.paragraphs || []).map((p, i) => (
              <p key={i} style={{ fontSize: '12.5px', lineHeight: 1.6, color: 'var(--text-soft)', fontStyle: 'italic', margin: 0 }}>{p}</p>
            ))}
            {letterSuggestion.grounding && !letterSuggestion.grounding.grounded && letterSuggestion.grounding.unsupported && letterSuggestion.grounding.unsupported.length > 0 && (
              <window.GroundingWarning grounding={letterSuggestion.grounding} />
            )}
          </div>
          <div style={{ display: 'flex', gap: '8px', padding: '10px 13px', borderTop: '1px solid var(--border)', background: 'var(--surface-subtle)' }}>
            <button onClick={acceptLetter} style={{ appearance: 'none', cursor: 'pointer', border: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px', fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 600, color: 'var(--accent-contrast)', background: 'var(--accent)', borderRadius: 'var(--radius-sm)', padding: '6px 12px' }}><BE.Icon name="check" size={13} />Übernehmen</button>
            <button onClick={() => setLetterSuggestion(null)} style={{ appearance: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px', fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 500, color: 'var(--text-muted)', background: 'transparent', border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-sm)', padding: '6px 12px' }}><BE.Icon name="x" size={13} />Verwerfen</button>
          </div>
        </div>
      )}

      <window.Editor
        key={reloadToken}
        talent={talent}
        onClose={onClose}
        onOpenSettings={onClose}
        getDocuments={() => window.RecruitApi.getJobApplicationDocuments(app.id)}
        saveDocuments={(docs) => window.RecruitApi.saveJobApplicationDocuments(app.id, docs)}
        renderPreviewHtml={(docs) => window.RecruitApi.previewDocumentsHtml(app.talentId || 'me', docs)}
        tools={['pdf']}
        exportPdf={exportCopyPdf}
      />
    </div>
  );
}

Object.assign(window, { BewerbungsEditor });
