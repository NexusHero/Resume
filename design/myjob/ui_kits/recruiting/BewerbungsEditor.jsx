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
  // AI consent gate (ADR-0063): every generative action here runs through it.
  const consent = window.useAiConsent
    ? window.useAiConsent()
    : { guard: (f) => f, dialog: null, rejected: false };

  // ---- Bewerbungsmappe (ADR-0061): attachment selection + downloads + freeze ----
  const [attachments, setAttachments] = React.useState(null); // null = loading
  const [selectedIds, setSelectedIds] = React.useState(() =>
    Array.isArray(application.selectedAttachmentIds) ? application.selectedAttachmentIds : [],
  );
  const [attachmentsBusy, setAttachmentsBusy] = React.useState(false);
  const [attachmentError, setAttachmentError] = React.useState(null);
  const [dossierBusy, setDossierBusy] = React.useState(null); // 'pdf' | 'zip' | null
  // Variante (a) (AK-4.5): one unfreeze confirmation per editor session.
  const [unfrozen, setUnfrozen] = React.useState(false);
  const [freezePrompt, setFreezePrompt] = React.useState(null); // { kind, payload } | null

  React.useEffect(() => {
    let alive = true;
    setAttachments(null);
    const p = window.RecruitApi && window.RecruitApi.listAttachments
      ? window.RecruitApi.listAttachments(app.talentId).catch(() => [])
      : Promise.resolve([]);
    p.then((list) => {
      if (!alive) return;
      // PDF-only selection (OQ3); the reference CV stays visible but never preselected.
      setAttachments(
        (Array.isArray(list) ? list : []).filter((a) => a.contentType === 'application/pdf'),
      );
    });
    return () => { alive = false; };
  }, [app.talentId]);

  React.useEffect(() => {
    let alive = true;
    const p =
      window.RecruitApi && window.RecruitApi.aiConfigured
        ? window.RecruitApi.aiConfigured()
        : Promise.resolve(true);
    p.then((ok) => { if (alive) setAiReady(ok); }).catch(() => { if (alive) setAiReady(false); });
    return () => { alive = false; };
  }, []);

  /* Magic Pen handlers (ADR-0060): passed to the Editor as its `pen` seam. Each
     calls the per-section route; acceptance happens inside the Editor's local
     form state (→ the existing autosave on the copy). */
  const pen = {
    headline: consent.guard(() => window.RecruitApi.penHeadline(app.id)),
    summary: consent.guard(() => window.RecruitApi.penSummary(app.id)),
    experience: consent.guard((index) => window.RecruitApi.penExperience(app.id, index)),
    skills: consent.guard(() => window.RecruitApi.penSkills(app.id)),
  };

  /* "Alles anpassen" (AK-3.5): a client-side fan-out over the section routes so
     the UI can show per-section progress and be aborted. */
  const [allTiles, setAllTiles] = React.useState(null); // null | tile[]
  const allAbortRef = React.useRef(null);
  // Which finished tile is in the "Trotzdem übernehmen" confirm step (OQ6): the
  // fan-out tiles use the same grounding gate as the per-section path.
  const [confirmingTile, setConfirmingTile] = React.useState(null); // { key, index } | null

  const tileViolation = (t) =>
    !!(t && t.suggestion && t.suggestion.grounding && !t.suggestion.grounding.grounded);
  const tileDiffKind = (key) =>
    key === 'skills' ? 'skills' : key === 'experience' ? 'array' : 'text';
  const isConfirming = (t) =>
    !!confirmingTile && confirmingTile.key === t.key && confirmingTile.index === t.index;

  const penCall = (key, index, signal) => {
    if (key === 'headline') return window.RecruitApi.penHeadline(app.id, signal);
    if (key === 'summary') return window.RecruitApi.penSummary(app.id, signal);
    if (key === 'experience') return window.RecruitApi.penExperience(app.id, index, signal);
    return window.RecruitApi.penSkills(app.id, signal);
  };

  const runAll = consent.guard(async () => {
    if (aiReady === false) {
      setLetterError('KI nicht eingerichtet — konfiguriere den zentralen Schlüssel in den Einstellungen.');
      return;
    }
    const controller = new AbortController();
    allAbortRef.current = controller;
    setConfirmingTile(null);
    const stations = (app.documents && app.documents.resume && app.documents.resume.experience) || [];
    const tiles = [
      { key: 'headline', label: 'Headline' },
      { key: 'summary', label: 'Profil' },
      ...stations.map((_, i) => ({ key: 'experience', index: i, label: `Station ${i + 1}` })),
      { key: 'skills', label: 'Skills' },
    ];
    setAllTiles(tiles.map((t) => ({ ...t, status: 'running' })));

    const settled = await Promise.allSettled(
      tiles.map((t) =>
        penCall(t.key, t.index, controller.signal).then(
          (suggestion) => ({ key: t.key, index: t.index, suggestion }),
          (error) => ({ key: t.key, index: t.index, error }),
        ),
      ),
    );

    if (controller.signal.aborted) {
      setAllTiles((prev) =>
        prev.map((t) => (t.status === 'running' ? { ...t, status: 'aborted' } : t)),
      );
      return;
    }
    setAllTiles((prev) =>
      prev.map((t) => {
        const r = settled.find(
          (res) => res.status === 'fulfilled' && res.value.key === t.key && res.value.index === t.index,
        );
        if (r && r.value.suggestion) return { ...t, status: 'done', suggestion: r.value.suggestion };
        const detail = r && r.value.error ? (r.value.error.message || 'Fehler') : 'Fehler';
        return { ...t, status: 'error', error: detail };
      }),
    );
  });

  const abortAll = () => {
    if (allAbortRef.current) allAbortRef.current.abort();
    setAllTiles((prev) =>
      prev ? prev.map((t) => (t.status === 'running' ? { ...t, status: 'aborted' } : t)) : null,
    );
  };

  const acceptAllTile = async (tile) => {
    if (!tile.suggestion) return;
    const docs = { ...app.documents };
    const resume = { ...docs.resume };
    if (tile.key === 'headline') docs.contact = { ...docs.contact, role: tile.suggestion.after };
    else if (tile.key === 'summary') resume.summary = tile.suggestion.after;
    else if (tile.key === 'experience') {
      const exp = [...resume.experience];
      exp[tile.index] = { ...exp[tile.index], bullets: tile.suggestion.after };
      resume.experience = exp;
    } else if (tile.key === 'skills') resume.skillGroups = tile.suggestion.after;
    docs.resume = resume;
    try {
      const saved = await window.RecruitApi.saveJobApplicationDocuments(app.id, docs);
      setApp((a) => ({ ...a, documents: saved }));
      setAllTiles((prev) => prev.map((t) => (t === tile ? { ...t, status: 'applied' } : t)));
      setConfirmingTile(null);
      setReloadToken((n) => n + 1);
      if (onChanged) onChanged();
    } catch {
      setLetterError('Der Abschnitt konnte nicht übernommen werden.');
    }
  };

  // The single gate (OQ6): a violating tile first asks for an explicit
  // "Trotzdem übernehmen" confirmation; only the second click writes the copy.
  const handleTileAccept = (tile) => {
    if (tileViolation(tile) && !isConfirming(tile)) {
      setConfirmingTile({ key: tile.key, index: tile.index });
      return;
    }
    void acceptAllTile(tile);
  };

  const allRunning = allTiles && allTiles.some((t) => t.status === 'running');
  const allStatusLabel = (status) =>
    status === 'running'
      ? 'läuft …'
      : status === 'done'
        ? 'fertig'
        : status === 'applied'
          ? 'übernommen'
          : status === 'aborted'
            ? 'abgebrochen'
            : 'fehler';

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

  const generateLetter = consent.guard(async () => {
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
  });

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

  /* ---- Einfrier-Bestätigung (AK-4.5, Variante (a)) ---- */
  const handleFrozen = (kind, payload) => {
    setFreezePrompt({ kind, payload });
  };

  const rejectUnfreeze = () => {
    setFreezePrompt(null);
    // Ablehnung: kein `unfreeze`; der Editor lädt die persistierte Kopie neu.
    setReloadToken((n) => n + 1);
  };

  const confirmUnfreeze = async () => {
    const prompt = freezePrompt;
    setFreezePrompt(null);
    if (!prompt) return;
    // Der Merker bleibt bis zum Schließen des Editors — ein Dialog pro Session.
    setUnfrozen(true);
    try {
      if (prompt.kind === 'documents') {
        const saved = await window.RecruitApi.saveJobApplicationDocuments(app.id, prompt.payload, true);
        setApp((a) => ({ ...a, documents: saved }));
        setReloadToken((n) => n + 1);
        if (onChanged) onChanged();
      } else if (prompt.kind === 'attachments') {
        const updated = await window.RecruitApi.updateJobApplicationAttachments(app.id, prompt.payload, true);
        setApp(updated);
        if (onChanged) onChanged();
      }
    } catch {
      /* das Status-Pill bleibt auf dem persistierten Wert */
    }
  };

  // The persistence seam: while the application is frozen and not yet confirmed,
  // a save answers 409 → hold the payload and ask; after confirmation every
  // subsequent save sends `?unfreeze=1` automatically (one dialog per session).
  const saveDocumentsSeam = async (docs) => {
    try {
      return await window.RecruitApi.saveJobApplicationDocuments(app.id, docs, unfrozen);
    } catch (e) {
      if (e && e.code === 'frozen') handleFrozen('documents', docs);
      throw e;
    }
  };

  const saveAttachments = async () => {
    setAttachmentsBusy(true);
    setAttachmentError(null);
    try {
      const updated = await window.RecruitApi.updateJobApplicationAttachments(
        app.id,
        selectedIds,
        unfrozen,
      );
      setApp(updated);
      if (onChanged) onChanged();
    } catch (e) {
      if (e && e.code === 'frozen') handleFrozen('attachments', selectedIds);
      else setAttachmentError((e && e.message) || 'Die Anhänge konnten nicht gespeichert werden.');
    } finally {
      setAttachmentsBusy(false);
    }
  };

  const toggleAttachment = (id) =>
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const downloadMappe = async (kind) => {
    setDossierBusy(kind);
    try {
      if (kind === 'pdf') await window.RecruitApi.downloadJobApplicationDossierPdf(app.id);
      else await window.RecruitApi.downloadJobApplicationDossierZip(app.id);
    } catch (e) {
      setAttachmentError((e && e.message) || 'Die Mappe konnte nicht erstellt werden.');
    } finally {
      setDossierBusy(null);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: isMobile ? 'auto' : '100%', gap: '14px' }}>
      {consent.dialog}
      {consent.rejected && !consent.dialog && (
        <div role="status" style={{ alignSelf: 'flex-start', fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-soft)', background: 'var(--surface-sunk)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '6px 12px' }}>
          KI-Aktion abgebrochen — ohne Einwilligung wird nichts übermittelt.
        </div>
      )}
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
        <button onClick={runAll} disabled={!!allRunning || aiReady === false} title={aiReady === false ? 'KI nicht eingerichtet' : 'Alle Abschnitte mit KI anpassen'} style={{ appearance: 'none', cursor: allRunning || aiReady === false ? 'default' : 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px', border: '1px solid var(--accent-border)', background: 'var(--accent-soft)', color: 'var(--accent-strong)', borderRadius: 'var(--radius-pill)', fontFamily: 'var(--font-mono)', fontSize: '11px', fontWeight: 600, padding: '6px 12px' }}>
          <BE.Icon name="edit" size={13} /> {allRunning ? 'Passe an …' : 'Alles für diese Stelle anpassen'}
        </button>
      </div>

      {allTiles && (
        <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', overflow: 'hidden', alignSelf: 'stretch' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '8px 12px', background: 'var(--accent-soft)', fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 600, color: 'var(--accent-strong)' }}>
            <BE.Icon name="edit" size={12} />Alles anpassen
            {allRunning && (
              <button onClick={abortAll} style={{ marginLeft: 'auto', appearance: 'none', cursor: 'pointer', border: '1px solid var(--border-strong)', background: 'transparent', color: 'var(--text-muted)', borderRadius: 'var(--radius-sm)', fontFamily: 'var(--font-body)', fontSize: '11px', fontWeight: 500, padding: '3px 10px' }}>Abbrechen</button>
            )}
          </div>
          {allTiles.map((t, i) => (
            <div key={i} style={{ padding: '10px 13px', borderTop: '1px solid var(--border)', fontSize: '12.5px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontWeight: 600, color: 'var(--text-heading)' }}>{t.label}</span>
                <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-mono)', fontSize: '11px', color: t.status === 'error' ? 'var(--danger)' : t.status === 'done' ? 'var(--positive, #1F8A5B)' : 'var(--text-muted)' }}>
                  {allStatusLabel(t.status)}
                </span>
              </div>
              {t.status === 'done' && (
                <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <window.EditorDiff
                    kind={tileDiffKind(t.key)}
                    before={t.suggestion.before}
                    after={t.suggestion.after}
                    unsupported={t.suggestion.grounding && t.suggestion.grounding.unsupported}
                  />
                  {tileViolation(t) && <window.GroundingWarning grounding={t.suggestion.grounding} />}
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    {isConfirming(t) ? (
                      <>
                        <button data-testid={`all-confirm-${t.key}${t.index != null ? `-${t.index}` : ''}`} onClick={() => acceptAllTile(t)} style={{ appearance: 'none', cursor: 'pointer', border: 'none', display: 'inline-flex', alignItems: 'center', gap: '5px', fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 600, color: 'var(--accent-contrast)', background: 'var(--accent)', borderRadius: 'var(--radius-sm)', padding: '5px 11px' }}>
                          <BE.Icon name="check" size={13} />Trotzdem übernehmen
                        </button>
                        <button onClick={() => setConfirmingTile(null)} style={{ appearance: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '5px', fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 500, color: 'var(--text-muted)', background: 'transparent', border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-sm)', padding: '5px 11px' }}>Abbrechen</button>
                      </>
                    ) : (
                      <button data-testid={`all-accept-${t.key}${t.index != null ? `-${t.index}` : ''}`} onClick={() => handleTileAccept(t)} style={{ appearance: 'none', cursor: 'pointer', border: 'none', display: 'inline-flex', alignItems: 'center', gap: '5px', fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 600, color: 'var(--accent-contrast)', background: 'var(--accent)', borderRadius: 'var(--radius-sm)', padding: '5px 11px' }}>
                        <BE.Icon name="check" size={13} />Übernehmen
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

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

      {/* Bewerbungsmappe (ADR-0061): downloads + PDF-only attachment selection. */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignSelf: 'stretch', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '12px 13px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap' }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 600, color: 'var(--text-soft)' }}>Bewerbungsmappe</span>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button onClick={() => downloadMappe('pdf')} disabled={dossierBusy !== null} data-testid="mappe-pdf" style={{ appearance: 'none', cursor: dossierBusy ? 'default' : 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px', border: '1px solid var(--accent-border)', background: 'var(--accent-soft)', color: 'var(--accent-strong)', borderRadius: 'var(--radius-pill)', fontFamily: 'var(--font-mono)', fontSize: '11px', fontWeight: 600, padding: '6px 12px', minHeight: isMobile ? '44px' : undefined }}>
              <BE.Icon name="download" size={13} /> Mappe als PDF
            </button>
            <button onClick={() => downloadMappe('zip')} disabled={dossierBusy !== null} data-testid="mappe-zip" style={{ appearance: 'none', cursor: dossierBusy ? 'default' : 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px', border: '1px solid var(--accent-border)', background: 'var(--accent-soft)', color: 'var(--accent-strong)', borderRadius: 'var(--radius-pill)', fontFamily: 'var(--font-mono)', fontSize: '11px', fontWeight: 600, padding: '6px 12px', minHeight: isMobile ? '44px' : undefined }}>
              <BE.Icon name="download" size={13} /> Mappe als ZIP
            </button>
          </div>
        </div>
        <div style={{ fontSize: '12.5px', color: 'var(--text-soft)' }}>Anhänge (nur PDF) für die Mappe auswählen:</div>
        {attachments === null ? (
          <div style={{ fontSize: '12px', color: 'var(--text-soft)' }}>Lädt …</div>
        ) : attachments.length === 0 ? (
          <div style={{ fontSize: '12px', color: 'var(--text-soft)' }}>Keine PDF-Anhänge vorhanden.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {attachments.map((a) => {
              const isReference = a.name === (window.ORIGINAL_CV_ATTACHMENT_NAME || '');
              return (
                <label key={a.id} style={{ display: 'flex', alignItems: 'center', gap: '9px', fontSize: '12.5px', color: 'var(--text-heading)', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    data-testid={`attachment-${a.id}`}
                    checked={selectedIds.includes(a.id)}
                    onChange={() => toggleAttachment(a.id)}
                  />
                  <span style={{ flex: 1 }}>{a.name}</span>
                  {isReference && <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-soft)' }}>Referenz</span>}
                </label>
              );
            })}
            <button onClick={saveAttachments} disabled={attachmentsBusy} data-testid="attachments-save" style={{ alignSelf: 'flex-start', appearance: 'none', cursor: attachmentsBusy ? 'default' : 'pointer', display: 'inline-flex', alignItems: 'center', gap: '5px', fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 600, color: 'var(--accent-contrast)', background: 'var(--accent)', borderRadius: 'var(--radius-sm)', padding: '5px 11px', minHeight: isMobile ? '44px' : undefined }}>
              <BE.Icon name="check" size={13} />Anhänge speichern
            </button>
          </div>
        )}
      </div>

      {attachmentError && (
        <div role="alert" style={{ alignSelf: 'flex-start', fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--danger)', background: 'var(--danger-soft)', border: '1px solid var(--danger)', borderRadius: 'var(--radius-md)', padding: '6px 12px' }}>
          {attachmentError}
        </div>
      )}

      {freezePrompt && (
        <div role="dialog" aria-modal="true" aria-label="Eingefrorene Bewerbung ändern" style={{ alignSelf: 'stretch', border: '1px solid var(--warning-strong, #8a6d00)', borderRadius: 'var(--radius-md)', background: 'var(--warning-soft, #fff8e1)', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ fontSize: '13px', color: 'var(--text-heading)', fontWeight: 600 }}>Diese Bewerbung ist versendet — wirklich ändern?</div>
          <div style={{ fontSize: '12px', color: 'var(--text-soft)' }}>Die Änderung wird im Verlauf vermerkt.</div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button data-testid="unfreeze-confirm" onClick={confirmUnfreeze} style={{ appearance: 'none', cursor: 'pointer', border: 'none', display: 'inline-flex', alignItems: 'center', gap: '5px', fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 600, color: 'var(--accent-contrast)', background: 'var(--accent)', borderRadius: 'var(--radius-sm)', padding: '6px 12px', minHeight: isMobile ? '44px' : undefined }}>
              <BE.Icon name="check" size={13} />Ändern
            </button>
            <button data-testid="unfreeze-cancel" onClick={rejectUnfreeze} style={{ appearance: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '5px', fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 500, color: 'var(--text-muted)', background: 'transparent', border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-sm)', padding: '6px 12px', minHeight: isMobile ? '44px' : undefined }}>
              <BE.Icon name="x" size={13} />Abbrechen
            </button>
          </div>
        </div>
      )}

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
        saveDocuments={saveDocumentsSeam}
        renderPreviewHtml={(docs) => window.RecruitApi.previewDocumentsHtml(app.talentId || 'me', docs)}
        tools={['pdf']}
        exportPdf={exportCopyPdf}
        pen={pen}
      />
    </div>
  );
}

Object.assign(window, { BewerbungsEditor });
