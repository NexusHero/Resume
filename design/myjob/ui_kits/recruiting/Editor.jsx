/* Editor — the document workbench: form on the left, live document preview on
   the right. Two documents per talent: Lebenslauf (resume) and Anschreiben
   (cover letter). The preview is an iframe of the exact HTML the server builds
   the PDF from (RecruitApi.previewDocumentsHtml → documents-html.ts), so what
   the recruiter sees is what the export produces — one source of truth, no
   drift (ADR-0052). The bolt-on tools live in their own modules: the
   import/ATS/pitch/outreach modals in EditorModals, shared primitives
   (PillButton, ModalShell, honesty banners) in EditorShared — main.jsx loads
   all of them before this file. */
const ED = window.MyJobDesignSystem_5611b7;
const { PillButton: EdPill, ImportCvModal: EdImportCvModal, AtsModal: EdAtsModal, PitchModal: EdPitchModal, OutreachModal: EdOutreachModal } = window;

/* A4 sheet width in CSS pixels (210mm @ 96dpi) — the preview iframe renders at
   this width so its line breaks match the exported PDF, then scales to fit. */
const A4_WIDTH_PX = 794;

/* CV style presets for the live customization bar (accent + font + size). */
const ED_ACCENTS = [
  { accent: '#2A6FDB', strong: '#1d4ed8', onDark: '#7aa7f5' },
  { accent: '#1F8A5B', strong: '#15734a', onDark: '#6ee7b7' },
  { accent: '#D97757', strong: '#b45309', onDark: '#f0a58a' },
  { accent: '#7C3AED', strong: '#6d28d9', onDark: '#c4b5fd' },
];

/* A titled block in the form column, with an optional add action and/or a
   leading section action (the Magic-Pen button). */
function FormGroup({ title, children, onAdd, action }) {
  return (
    <div style={{ marginBottom: '22px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '11px' }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>{title}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {action}
          {onAdd && <ED.IconButton icon="plus" label="Hinzufügen" variant="ghost" size="sm" onClick={onAdd} />}
        </div>
      </div>
      {children}
    </div>
  );
}

/* The full bolt-on toolbar of the talent editor (ADR-0059): the application
   editor passes a reduced `tools` set so no base-write path exists from it. */
const DEFAULT_TOOLS = ['import', 'ats', 'pitch', 'outreach', 'translate', 'pdf', 'ai'];

function Editor({ talent, onClose, onOpenSettings, getDocuments, saveDocuments, renderPreviewHtml, tools, exportPdf, pen }) {
  /* ---- Identity & persistence flags first — used by every handler below.
     The pinned "me" profile has no server row, so it stays local-only. ---- */
  const talentId = talent.id;
  const canPersist = !!talentId && talentId !== 'me';
  const { isMobile } = window.useViewport ? window.useViewport() : { isMobile: false };
  // Persistence + preview seam (ADR-0059): defaults are the talent-editor calls;
  // the application editor overrides them to read/write the embedded copy.
  const loadDocs = getDocuments || (() => window.RecruitApi.getTalentDocuments(talentId));
  const persistDocs =
    saveDocuments || ((payload) => window.RecruitApi.saveTalentDocuments(talentId, payload));
  const renderPreview =
    renderPreviewHtml ||
    ((docs) => window.RecruitApi.previewDocumentsHtml(talentId || 'me', docs));
  const toolset = new Set(tools ?? DEFAULT_TOOLS);
  const hasTool = (t) => toolset.has(t);

  const [doc, setDoc] = React.useState('lebenslauf');
  const previewRef = React.useRef(null);
  const frameRef = React.useRef(null);
  const [scale, setScale] = React.useState(1);
  const [frameHeight, setFrameHeight] = React.useState(A4_WIDTH_PX * 1.414); // one A4 until measured
  React.useEffect(() => {
    const el = previewRef.current; if (!el) return;
    const fit = () => { const w = el.clientWidth - 56; setScale(Math.min(1, w / A4_WIDTH_PX)); };
    fit();
    const ro = new ResizeObserver(fit); ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const [contact, setContact] = React.useState({ name: talent.name, role: talent.role, email: talent.email, phone: talent.phone, location: talent.location, linkedin: talent.linkedin || '', src: talent.src });
  const [resume, setResume] = React.useState(() => JSON.parse(JSON.stringify(talent.resume || { summary: '', experience: [], education: [], skillGroups: [] })));
  const [letter, setLetter] = React.useState(() => JSON.parse(JSON.stringify(talent.letter || { firma: '', ansprechpartner: '', strasse: '', plzOrt: '', betreff: '', anrede: 'Sehr geehrte Damen und Herren,', absaetze: [''], gruss: 'Mit freundlichen Grüßen' })));

  const setC = (k, v) => setContact((s) => ({ ...s, [k]: v }));

  /* Portrait upload: downscale to 512px via canvas so the data URI stays well
     under the server's 300 KB cap, then store it on the contact block. */
  const [photoMsg, setPhotoMsg] = React.useState(null);
  const uploadPhoto = (file) => {
    setPhotoMsg(null);
    if (!file) return;
    if (!file.type.startsWith('image/')) { setPhotoMsg('Bitte wähle eine Bilddatei aus.'); return; }
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const max = 512;
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      const dataUri = canvas.toDataURL('image/jpeg', 0.85);
      if (dataUri.length > 300000) { setPhotoMsg('Das Foto ist auch nach dem Verkleinern zu groß. Bitte wähle ein kleineres Bild.'); return; }
      setC('photo', dataUri);
    };
    img.onerror = () => { URL.revokeObjectURL(url); setPhotoMsg('Das Bild konnte nicht gelesen werden. Bitte versuche eine andere Datei.'); };
    img.src = url;
  };
  const setExp = (i, k, v) => setResume((s) => { const e = [...s.experience]; e[i] = { ...e[i], [k]: v }; return { ...s, experience: e }; });
  const setEdu = (i, k, v) => setResume((s) => { const e = [...s.education]; e[i] = { ...e[i], [k]: v }; return { ...s, education: e }; });
  const addExp = () => setResume((s) => ({ ...s, experience: [{ role: 'Neue Position', company: '', period: '', location: '', bullets: [''], skills: [] }, ...s.experience] }));
  // Undo over silent-delete (#200), matching every other destructive action in
  // the app: removing a whole entry is easy to trigger by mis-click, so give
  // the recruiter a few seconds to bring it back instead of losing it outright.
  const delExp = (i) => {
    const removed = resume.experience[i];
    setResume((s) => ({ ...s, experience: s.experience.filter((_, j) => j !== i) }));
    window.UndoDelete.schedule({
      label: `${removed.role || removed.company || 'Berufserfahrung'} entfernt`,
      commit: () => {},
      restore: () =>
        setResume((s) => {
          const arr = s.experience.slice();
          arr.splice(Math.min(i, arr.length), 0, removed);
          return { ...s, experience: arr };
        }),
    });
  };
  const setPara = (i, v) => setLetter((s) => { const a = [...s.absaetze]; a[i] = v; return { ...s, absaetze: a }; });
  const addPara = () => setLetter((s) => ({ ...s, absaetze: [...s.absaetze, ''] }));

  /* ---- Magic: AI adjusts the active document. The suggestion is shown GREY
     and only applied on “Apply” (or discarded on “Discard”). ---- */
  const [gen, setGen] = React.useState(false);
  const [pending, setPending] = React.useState(null);
  // A failed AI call must never be silent — the recruiter sees why it stopped
  // (missing key, Pro gate, network) instead of a button that does nothing.
  const [aiError, setAiError] = React.useState(null);
  const [aiReady, setAiReady] = React.useState(null);
  const consent = window.useAiConsent
    ? window.useAiConsent()
    : { guard: (f) => f, dialog: null, rejected: false };
  React.useEffect(() => {
    let alive = true;
    const p = window.RecruitApi && window.RecruitApi.aiConfigured
      ? window.RecruitApi.aiConfigured()
      : Promise.resolve(true);
    p.then((ok) => { if (alive) setAiReady(ok); }).catch(() => { if (alive) setAiReady(false); });
    return () => { alive = false; };
  }, []);
  const runAI = consent.guard(async () => {
    if (aiReady === false) {
      setAiError('KI nicht eingerichtet — konfiguriere den zentralen Schlüssel in den Einstellungen.');
      return;
    }
    setGen(true);
    setAiError(null);
    setPending(null);
    const action = doc === 'lebenslauf' ? 'summary' : 'letter';
    try {
      // The AI uses the candidate's own saved facts + the mandate/company on the
      // letter; for the pinned demo talent (no server row) there is no endpoint.
      const target = action === 'letter' ? { company: letter.firma, role: letter.betreff } : {};
      const s = await window.RecruitApi.suggestDocument(talentId, action, target);
      if (s.action === 'summary') setPending({ kind: 'summary', value: s.text, provider: s.provider, usage: s.usage });
      else setPending({ kind: 'letter', value: s.paragraphs, provider: s.provider, usage: s.usage });
    } catch (e) {
      setAiError(
        e && e.code === 'ai-not-configured'
          ? 'KI nicht eingerichtet — richte einen Server-Key ein.'
          : (e && e.message) || 'Dieses Dokument konnte nicht angepasst werden. Bitte versuche es erneut.',
      );
    } finally {
      setGen(false);
    }
  });
  const acceptAI = () => {
    if (pending && pending.kind === 'summary') setResume((s) => ({ ...s, summary: pending.value }));
    if (pending && pending.kind === 'letter') setLetter((s) => ({ ...s, absaetze: pending.value }));
    if (pending && pending.kind === 'import') {
      if (pending.mode === 'text') {
        void acceptTextImport(pending);
      } else {
        if (Object.keys(pending.contact).length) setContact((s) => ({ ...s, ...pending.contact }));
        if (pending.resume) setResume(pending.resume);
      }
    }
    setPending(null);
  };
  const cancelAI = () => { setPending(null); setAiError(null); };

  /* ---- Magic Pen (ADR-0060): per-section rewrite of the copy. The `pen` prop
     is absent in the talent editor (no base-write path); the application editor
     passes handlers that call the per-section routes. A suggestion is staged as
     a before/after diff and only written on "Übernehmen" — the existing autosave
     then persists the copy (never the base CV). ---- */
  const [penPending, setPenPending] = React.useState(null); // { key, index, suggestion }
  const [penBusy, setPenBusy] = React.useState(null); // { key, index } while running
  const [penError, setPenError] = React.useState(null);
  const [penConfirm, setPenConfirm] = React.useState(false);
  const hasPen = (key) => !!(pen && typeof pen[key] === 'function');

  const runPen = consent.guard(async (key, index) => {
    if (!hasPen(key)) return;
    if (aiReady === false) {
      setPenError('KI nicht eingerichtet — konfiguriere den zentralen Schlüssel in den Einstellungen.');
      return;
    }
    setPenBusy({ key, index });
    setPenError(null);
    setPenPending(null);
    setPenConfirm(false);
    try {
      const suggestion = await pen[key](index);
      // Defensive guard: a seam that resolved without a usable suggestion (or
      // without an `after` value) must surface an error instead of staging a
      // broken `penPending` whose render would dereference `suggestion.grounding`.
      if (!suggestion || suggestion.after == null) {
        setPenError('Dieser Abschnitt konnte nicht angepasst werden. Bitte versuche es erneut.');
        return;
      }
      setPenPending({ key, index, suggestion });
    } catch (e) {
      setPenError(
        e && e.code === 'ai-not-configured'
          ? 'KI nicht eingerichtet — richte einen Server-Key ein.'
          : (e && e.message) || 'Dieser Abschnitt konnte nicht angepasst werden. Bitte versuche es erneut.',
      );
    } finally {
      setPenBusy(null);
    }
  });

  // Writing a suggestion only touches the copy's local form state → autosave.
  const applyPen = () => {
    const { key, index, suggestion } = penPending || {};
    if (!suggestion) return;
    if (key === 'headline') setContact((s) => ({ ...s, role: suggestion.after }));
    else if (key === 'summary') setResume((s) => ({ ...s, summary: suggestion.after }));
    else if (key === 'experience')
      setResume((s) => {
        const e = [...s.experience];
        e[index] = { ...e[index], bullets: suggestion.after };
        return { ...s, experience: e };
      });
    else if (key === 'skills') setResume((s) => ({ ...s, skillGroups: suggestion.after }));
    setPenPending(null);
    setPenConfirm(false);
  };

  const discardPen = () => { setPenPending(null); setPenConfirm(false); };

  const penViolation =
    penPending && penPending.suggestion.grounding && !penPending.suggestion.grounding.grounded;

  // The per-section diff `kind` derives from the suggestion's own section value.
  const penDiffKind = (section) =>
    section === 'skills' ? 'skills' : section === 'experienceBullets' ? 'array' : 'text';

  const penButton = (key, index, label) => {
    if (!hasPen(key)) return null;
    const busy = penBusy && penBusy.key === key && penBusy.index === index;
    return (
      <button
        type="button"
        onClick={() => runPen(key, index)}
        disabled={aiReady === false || !!busy}
        aria-label={label}
        data-testid={index == null ? `pen-${key}` : `pen-${key}-${index}`}
        title={aiReady === false ? 'KI nicht eingerichtet' : label}
        style={{ appearance: 'none', border: '1px solid var(--border-strong)', background: 'transparent', borderRadius: 'var(--radius-sm)', cursor: aiReady === false || busy ? 'default' : 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '26px', height: '26px', color: 'var(--text-soft)', opacity: aiReady === false || busy ? 0.5 : 1 }}
      >
        <ED.Icon name={busy ? 'clock' : 'edit'} size={13} />
      </button>
    );
  };


  /* live CV customization: template, accent colour, font family, size */
  const [cfg, setCfg] = React.useState({ template: 'classic', accent: '#2A6FDB', strong: '#1d4ed8', onDark: '#7aa7f5', font: 'var(--font-display)', size: 1 });

  /* ---- Live preview: the server renders the current (unsaved) content to the
     exact HTML the PDF is built from, so preview and export can't drift. A short
     debounce keeps typing snappy; the last good HTML is kept if a render fails.
     Feature-detected so the editor still mounts where the endpoint is absent. ---- */
  const [previewHtml, setPreviewHtml] = React.useState(null);
  React.useEffect(() => {
    const api = window.RecruitApi;
    if (!api || typeof api.previewDocumentsHtml !== 'function') return undefined;
    let cancelled = false;
    const timer = setTimeout(() => {
      renderPreview({ contact, resume, letter, style: cfg })
        .then((html) => { if (!cancelled && typeof html === 'string') setPreviewHtml(html); })
        .catch(() => { /* keep the last good preview on a transient failure */ });
    }, 300);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [contact, resume, letter, cfg, talentId]);

  /* Size the iframe to its content (no inner scrollbar) and scroll the pane to
     the document the Resume/Cover-letter toggle selects. Runs on each render and
     when the toggle flips; same-origin srcdoc makes the inner doc readable. */
  const syncFrame = React.useCallback(() => {
    const f = frameRef.current;
    const inner = f && f.contentDocument;
    if (!inner) return;
    const h = inner.documentElement ? inner.documentElement.scrollHeight : 0;
    if (h) setFrameHeight(h);
    const target = inner.getElementById(doc === 'lebenslauf' ? 'doc-resume' : 'doc-letter');
    const pane = previewRef.current;
    if (target && pane) pane.scrollTo({ top: target.offsetTop * scale, behavior: 'smooth' });
  }, [doc, scale]);
  React.useEffect(() => { syncFrame(); }, [doc, previewHtml, syncFrame]);

  /* ---- Persistence: load the stored documents on open, then autosave edits. ---- */
  const [saveState, setSaveState] = React.useState('idle'); // idle | saving | saved | error
  const [hydrated, setHydrated] = React.useState(false);
  // Serialized snapshot of the last loaded/saved payload. Autosave compares
  // against it so merely *opening* a document never re-PUTs the unchanged
  // content it just loaded — only genuine edits save.
  const baseline = React.useRef(null);
  const saveTimer = React.useRef(null);
  // The debounced save still in flight (scheduled but not yet sent) — flushed
  // immediately if the editor unmounts before the 800ms debounce fires, so
  // navigating away right after typing never silently drops the last edits.
  const pendingSave = React.useRef(null);

  React.useEffect(() => {
    let alive = true;
    setHydrated(false);
    baseline.current = null;
    if (!canPersist) { setHydrated(true); return undefined; }
    loadDocs()
      .then((d) => {
        if (!alive) return;
        // Apply the loaded content and flip `hydrated` in the *same* React batch
        // so the baseline (captured on the hydrated render) reflects the loaded
        // documents, never a user edit that arrived a tick later.
        if (d) {
          if (d.contact) setContact((s) => ({ ...s, ...d.contact }));
          if (d.resume) setResume(d.resume);
          if (d.letter) setLetter(d.letter);
          if (d.style) setCfg(d.style);
        }
        setHydrated(true);
      })
      .catch(() => { if (alive) setHydrated(true); });
    return () => { alive = false; };
  }, [talentId]);

  // Once the load settles, capture the hydrated content as the save baseline.
  React.useEffect(() => {
    if (hydrated && baseline.current === null) {
      baseline.current = JSON.stringify({ contact, resume, letter, style: cfg });
    }
  }, [hydrated]);

  React.useEffect(() => {
    if (!canPersist || !hydrated || baseline.current === null) return undefined;
    const serialized = JSON.stringify({ contact, resume, letter, style: cfg });
    if (serialized === baseline.current) return undefined; // nothing actually changed
    setSaveState('saving');
    clearTimeout(saveTimer.current);
    const payload = { contact, resume, letter, style: cfg };
    pendingSave.current = { talentId, payload, serialized };
    saveTimer.current = setTimeout(() => {
      persistDocs(payload)
        .then(() => { baseline.current = serialized; setSaveState('saved'); })
        .catch(() => setSaveState('error'))
        .finally(() => { pendingSave.current = null; });
    }, 800);
    return () => clearTimeout(saveTimer.current);
  }, [contact, resume, letter, cfg, hydrated, talentId]);

  // Flush a still-debounced save on unmount (e.g. the recruiter navigates away
  // within the 800ms window) — otherwise the last edits are silently lost,
  // since the pending setTimeout above is cleared, not fired, on unmount.
  React.useEffect(() => () => {
    const pending = pendingSave.current;
    if (!pending) return;
    pendingSave.current = null;
    persistDocs(pending.payload).catch(() => {});
  }, []);

  const saveLabel = { saving: 'Speichere…', saved: 'Gespeichert', error: 'Nicht gespeichert' };

  /* The import modal hands the parsed CV back here to fill the form. */
  /* The parsed CV is staged like an AI suggestion — shown in the preview
     banner and only applied on "Apply". Empty parsed contact fields never
     overwrite values the recruiter already typed. */
  const applyParsed = (parsed) => {
    const contactPatch = {};
    Object.entries(parsed.contact || {}).forEach(([k, v]) => {
      if (typeof v === 'string' && v.trim()) contactPatch[k] = v;
    });
    setPending({
      kind: 'import',
      contact: contactPatch,
      resume: parsed.resume || null,
      mode: parsed.mode || (parsed.provider ? 'ai' : 'text'),
      truncated: parsed.truncated,
      file: parsed.file || null,
      provider: parsed.provider,
      usage: parsed.usage,
    });
  };

  // Text-mode import: only empty fields are filled; the PDF is uploaded only
  // now (accept), never on preview/discard; a same-name/same-size attachment is
  // replaced so re-imports do not pile up duplicates.
  const acceptTextImport = async (pendingImport) => {
    const merged = window.mergeTextImport(
      { contact, resume },
      { contact: pendingImport.contact || {}, resume: pendingImport.resume || {} },
    );
    setContact((s) => ({ ...s, ...merged.contact }));
    setResume((s) => ({ ...merged.resume, rawText: s.rawText && !merged.resume.rawText ? s.rawText : merged.resume.rawText }));
    if (pendingImport.file && canPersist) {
      const originalName =
        window.ORIGINAL_CV_ATTACHMENT_NAME || 'Original-Lebenslauf (Import).pdf';
      try {
        // Upload FIRST, then remove older originals: a failed upload never
        // leaves the candidate without the CV (ADR-0057).
        const created = await window.RecruitApi.uploadAttachment(talentId, {
          name: originalName,
          contentType: 'application/pdf',
          dataBase64: pendingImport.file.dataBase64,
        });
        const atts = await window.RecruitApi.listAttachments(talentId);
        for (const att of atts || []) {
          if (att.id !== created.id && att.name === originalName) {
            await window.RecruitApi.deleteAttachment(att.id).catch(() => {});
          }
        }
      } catch {
        // The imported text is already applied and stays; only the attachment
        // failed — show it visibly.
        setAiError('Der Text wurde übernommen, das PDF konnte aber nicht gespeichert werden.');
      }
    }
  };

  /* ---- Translate: create the other-language variant of the documents ---- */
  const [translating, setTranslating] = React.useState('');
  const [translateMsg, setTranslateMsg] = React.useState(null);
  const runTranslate = async (lang) => {
    if (!canPersist || translating) return;
    if (window.AiStatus && window.AiStatus.get().status === 'not-configured') {
      setTranslateMsg({ ok: false, text: 'KI nicht eingerichtet — konfiguriere den zentralen Schlüssel in den Einstellungen.' });
      return;
    }
    setTranslating(lang);
    setTranslateMsg(null);
    try {
      const res = await window.RecruitApi.translateDocuments(talentId, lang);
      const name = lang === 'de' ? 'Deutsche' : 'Englische';
      const spend = res.usage
        ? ` (${res.usage.inputTokens + res.usage.outputTokens} tok · $${res.usage.costUsd < 0.01 ? res.usage.costUsd.toFixed(4) : res.usage.costUsd.toFixed(2)})`
        : '';
      setTranslateMsg({
        ok: true,
        text: res.created ? `${name} Fassung erstellt.${spend}` : `${name} Fassung existiert bereits.`,
      });
    } catch (e) {
      setTranslateMsg({ ok: false, text: (e && e.message) || 'Übersetzung fehlgeschlagen. Bitte versuche es erneut.' });
    }
    setTranslating('');
  };

  /* ---- Export: download the resume + cover letter as a real PDF file. A bare
     window.open() was unreliable (strict CSP / PWA / native shell), so fetch the
     bytes and save them — and surface any failure instead of doing nothing.
     Download seam (ADR-0059 §6.3): the talent editor exports the stored documents;
     the application editor overrides it to render the embedded copy (via the
     documents-body dossier-preview endpoint — no new endpoint, no base-write). ---- */
  const runExportPdf =
    exportPdf ||
    ((docs, filename) =>
      window.RecruitApi.downloadTalentDocumentsPdf(talentId, filename || `documents-${talentId}.pdf`));
  const [pdfMsg, setPdfMsg] = React.useState(null);
  const [pdfBusy, setPdfBusy] = React.useState(false);
  const handleExportPdf = async () => {
    setPdfMsg(null);
    setPdfBusy(true);
    try {
      const base = (contact.name || 'documents').trim().replace(/\s+/g, '-') || 'documents';
      await runExportPdf({ contact, resume, letter, style: cfg }, `${base}.pdf`);
    } catch {
      setPdfMsg('Der PDF-Download ist fehlgeschlagen. Bitte versuche es erneut.');
    }
    setPdfBusy(false);
  };

  /* Which bolt-on tool is open — one at a time. */
  const [modal, setModal] = React.useState(null); // 'import' | 'ats' | 'pitch' | 'outreach' | null

  const seg = (id, label) => (
    <button onClick={() => setDoc(id)} style={{ flex: 1, padding: isMobile ? '12px 10px' : '8px 10px', minHeight: isMobile ? '44px' : undefined, border: 'none', cursor: 'pointer', borderRadius: 'var(--radius-sm)', fontFamily: 'var(--font-mono)', fontSize: '12px', fontWeight: 600, background: doc === id ? 'var(--surface-card)' : 'transparent', color: doc === id ? 'var(--text-heading)' : 'var(--text-soft)', boxShadow: doc === id ? 'var(--shadow-xs)' : 'none' }}>{label}</button>
  );

  return (
    <div data-doc-hydrated={canPersist ? (hydrated ? 'true' : 'false') : 'na'} style={{ display: 'flex', flexDirection: 'column', height: isMobile ? 'auto' : '100%', gap: '14px' }}>
      {consent.dialog}
      {consent.rejected && !consent.dialog && (
        <div role="status" style={{ alignSelf: 'flex-start', fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-soft)', background: 'var(--surface-sunk)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '6px 12px' }}>
          KI-Aktion abgebrochen — ohne Einwilligung wird nichts übermittelt.
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: isMobile ? 'wrap' : 'nowrap', alignSelf: isMobile ? 'stretch' : 'flex-start' }}>
        <button onClick={onClose} style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-muted)', padding: 0 }}>
          <ED.Icon name="arrowLeft" size={14} /> Zurück zum Profil
        </button>
        {canPersist && saveState !== 'idle' && (
          <span role="status" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontFamily: 'var(--font-mono)', fontSize: '11px', color: saveState === 'error' ? 'var(--danger)' : 'var(--text-soft)' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: saveState === 'saved' ? 'var(--positive, #1F8A5B)' : saveState === 'error' ? 'var(--danger)' : 'var(--text-muted)' }} />
            {saveLabel[saveState]}
          </span>
        )}
        {canPersist && (
          <>
            {hasTool('import') && <EdPill icon="upload" onClick={() => setModal('import')}>CV importieren</EdPill>}
            {hasTool('ats') && <EdPill icon="search" onClick={() => setModal('ats')}>ATS-Check</EdPill>}
            {hasTool('pitch') && (!window.useWorkspaceSettings || window.useWorkspaceSettings().vermittlung) && (
              <EdPill icon="briefcase" onClick={() => setModal('pitch')}>Pitch</EdPill>
            )}
            {hasTool('outreach') && (!window.useWorkspaceSettings || window.useWorkspaceSettings().vermittlung) && (
              <EdPill icon="send" onClick={() => setModal('outreach')}>Ansprache</EdPill>
            )}
            {hasTool('pdf') && <EdPill icon="download" onClick={handleExportPdf} disabled={pdfBusy}>{pdfBusy ? 'PDF…' : 'PDF'}</EdPill>}
            {hasTool('translate') && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-soft)' }}>
                  <ED.Icon name="globe" size={13} /> Übersetzen
                </span>
                {[['en', 'EN'], ['de', 'DE']].map(([lang, label]) => (
                  <EdPill
                    key={lang}
                    onClick={() => runTranslate(lang)}
                    disabled={!!translating}
                    title={`Dokumente auf ${lang === 'de' ? 'Deutsch' : 'Englisch'} übersetzen`}
                    style={{ fontWeight: 600, padding: '4px 10px', opacity: translating && translating !== lang ? 0.5 : 1 }}
                  >
                    {translating === lang ? '…' : label}
                  </EdPill>
                ))}
              </span>
            )}
          </>
        )}
      </div>

      {translateMsg && (
        <div
          role="status"
          style={{ alignSelf: 'flex-start', fontFamily: 'var(--font-mono)', fontSize: '11px', color: translateMsg.ok ? 'var(--positive, #1F8A5B)' : 'var(--danger)', background: translateMsg.ok ? 'var(--positive-soft, rgba(31,138,91,0.10))' : 'var(--danger-soft)', border: `1px solid ${translateMsg.ok ? 'var(--positive, #1F8A5B)' : 'var(--danger)'}`, borderRadius: 'var(--radius-md)', padding: '6px 12px' }}
        >
          {translateMsg.text}
        </div>
      )}

      {pdfMsg && (
        <div
          role="alert"
          style={{ alignSelf: 'flex-start', fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--danger)', background: 'var(--danger-soft)', border: '1px solid var(--danger)', borderRadius: 'var(--radius-md)', padding: '6px 12px' }}
        >
          {pdfMsg}
        </div>
      )}

      {modal === 'import' && <EdImportCvModal talentId={talentId} onParsed={applyParsed} onClose={() => setModal(null)} />}
      {modal === 'ats' && <EdAtsModal talentId={talentId} onClose={() => setModal(null)} />}
      {modal === 'pitch' && <EdPitchModal talentId={talentId} onClose={() => setModal(null)} />}
      {modal === 'outreach' && <EdOutreachModal talentId={talentId} defaultEmail={contact.email} onClose={() => setModal(null)} />}

      {/* On mobile the 380px form pane can't sit beside the preview — stack them
          (form, then live preview) and let the page scroll. Both panes stay
          mounted so the preview's fit-to-width scaling still runs (ADR-0027). */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '380px 1fr', gap: '20px', flex: 1, minHeight: 0, minWidth: 0 }}>
        {/* LEFT — form */}
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0, minWidth: 0 }}>
          <div style={{ display: 'flex', gap: '4px', background: 'var(--surface-sunk)', borderRadius: 'var(--radius-md)', padding: '4px', marginBottom: '16px' }}>
            {seg('lebenslauf', 'Lebenslauf')}{seg('anschreiben', 'Anschreiben')}
          </div>

          <div style={{ flex: 1, overflowY: 'auto', paddingRight: '8px' }}>
            {aiError && !gen && (
              <div role="alert" style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', border: '1px solid var(--danger)', background: 'var(--danger-soft)', borderRadius: 'var(--radius-md)', padding: '10px 13px', marginBottom: '16px', fontSize: '12.5px', color: 'var(--danger)' }}>
                <ED.Icon name="alertTriangle" size={14} style={{ flexShrink: 0, marginTop: '1px' }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600 }}>KI-Anpassung fehlgeschlagen</div>
                  <div style={{ marginTop: '2px' }}>{aiError}</div>
                </div>
                <button onClick={runAI} style={{ appearance: 'none', cursor: 'pointer', border: '1px solid var(--danger)', background: 'transparent', color: 'var(--danger)', borderRadius: 'var(--radius-sm)', fontFamily: 'var(--font-mono)', fontSize: '11px', fontWeight: 600, padding: '4px 10px' }}>Erneut versuchen</button>
              </div>
            )}
            {(gen || pending) && (
              <div style={{ border: '1px dashed var(--accent-border)', borderRadius: 'var(--radius-md)', overflow: 'hidden', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '8px 12px', background: 'var(--accent-soft)', fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 600, color: 'var(--accent-strong)' }}>
                  <ED.Icon name="zap" size={12} />Vorschlag · noch nicht übernommen
                  {pending && pending.provider && (
                    <span style={{ marginLeft: 'auto' }}><window.ProviderBadge provider={pending.provider} usage={pending.usage} /></span>
                  )}
                </div>
                <div style={{ padding: '12px 13px' }}>
                  {!gen && pending.truncated && (
                    <div role="status" style={{ fontSize: '12px', fontWeight: 600, color: 'var(--warning-strong, #8a6d00)', marginBottom: '8px' }}>
                      Text wurde bei 50.000 Zeichen gekürzt.
                    </div>
                  )}
                  {gen ? (
                    <div style={{ fontSize: '12.5px', color: 'var(--accent-strong)', fontStyle: 'italic' }}>myJob passt an …</div>
                  ) : pending.kind === 'import' && pending.mode === 'text' && window.TextImportNotice ? (
                    <div>
                      <window.TextImportNotice />
                      <div style={{ fontSize: '12.5px', lineHeight: 1.7, color: 'var(--text-soft)', marginTop: '8px' }}>
                        Der volle CV-Text wird als „Importierter Text (ohne KI)“ gespeichert. Vorhandene
                        Stationen, Ausbildung, Skills, Profil und Kontakt bleiben unverändert; nur leere
                        Felder werden gefüllt.
                      </div>
                    </div>
                  ) : pending.kind === 'import' ? (
                    <div style={{ fontSize: '12.5px', lineHeight: 1.7, color: 'var(--text-soft)' }}>
                      <div style={{ fontWeight: 600, color: 'var(--text-heading)', marginBottom: '4px' }}>Aus dem CV gelesen:</div>
                      {Object.keys(pending.contact).length > 0 && <div>Kontakt: {Object.entries(pending.contact).map(([k, v]) => `${k} „${v}“`).join(', ')}</div>}
                      {pending.resume && <div>{(pending.resume.experience || []).length} Berufserfahrung · {(pending.resume.education || []).length} Ausbildung · {(pending.resume.skillGroups || []).flatMap((g) => g.items || []).length} Skills</div>}
                      {pending.resume && pending.resume.summary && <div style={{ fontStyle: 'italic', marginTop: '4px' }}>“{pending.resume.summary.slice(0, 220)}{pending.resume.summary.length > 220 ? '…' : ''}”</div>}
                      {Object.keys(pending.contact).length === 0 && !pending.resume && <div>Aus diesem Text konnte nichts extrahiert werden.</div>}
                    </div>
                  ) : pending.kind === 'summary' ? (
                    <div style={{ fontSize: '12.5px', lineHeight: 1.6, color: 'var(--text-soft)', fontStyle: 'italic' }}>{pending.value}</div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>{pending.value.map((p, i) => <p key={i} style={{ fontSize: '12.5px', lineHeight: 1.6, color: 'var(--text-soft)', fontStyle: 'italic', margin: 0 }}>{p}</p>)}</div>
                  )}
                </div>
                {!gen && (
                  <div style={{ display: 'flex', gap: '8px', padding: '10px 13px', borderTop: '1px solid var(--border)', background: 'var(--surface-subtle)' }}>
                    <button onClick={acceptAI} style={{ appearance: 'none', cursor: 'pointer', border: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px', fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 600, color: 'var(--accent-contrast)', background: 'var(--accent)', borderRadius: 'var(--radius-sm)', padding: '6px 12px' }}><ED.Icon name="check" size={13} />Übernehmen</button>
                    <button onClick={cancelAI} style={{ appearance: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px', fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 500, color: 'var(--text-muted)', background: 'transparent', border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-sm)', padding: '6px 12px' }}><ED.Icon name="x" size={13} />Verwerfen</button>
                  </div>
                )}
              </div>
            )}
            {penError && !penBusy && (
              <div role="alert" style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', border: '1px solid var(--danger)', background: 'var(--danger-soft)', borderRadius: 'var(--radius-md)', padding: '10px 13px', marginBottom: '16px', fontSize: '12.5px', color: 'var(--danger)' }}>
                <ED.Icon name="alertTriangle" size={14} style={{ flexShrink: 0, marginTop: '1px' }} />
                <div style={{ flex: 1 }}>{penError}</div>
              </div>
            )}
            {penPending && (
              <div style={{ border: '1px dashed var(--accent-border)', borderRadius: 'var(--radius-md)', overflow: 'hidden', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '8px 12px', background: 'var(--accent-soft)', fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 600, color: 'var(--accent-strong)' }}>
                  <ED.Icon name="edit" size={12} />Vorschlag · noch nicht übernommen
                  {penPending.suggestion.provider && (
                    <span style={{ marginLeft: 'auto' }}><window.ProviderBadge provider={penPending.suggestion.provider} usage={penPending.suggestion.usage} /></span>
                  )}
                </div>
                <div style={{ padding: '12px 13px' }}>
                  <window.EditorDiff
                    kind={penDiffKind(penPending.suggestion.section)}
                    before={penPending.suggestion.before}
                    after={penPending.suggestion.after}
                    unsupported={penPending.suggestion.grounding && penPending.suggestion.grounding.unsupported}
                  />
                  {penViolation && <window.GroundingWarning grounding={penPending.suggestion.grounding} />}
                  {penConfirm && (
                    <div role="alert" style={{ marginTop: '10px', border: '1px solid var(--warning-border, #e6b800)', background: 'var(--warning-soft, rgba(230,184,0,0.10))', borderRadius: 'var(--radius-md)', padding: '8px 11px', fontSize: '12.5px', color: 'var(--text-body)' }}>
                      Dieser Vorschlag enthält nicht belegte Angaben. Trotzdem übernehmen?
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '8px', padding: '10px 13px', borderTop: '1px solid var(--border)', background: 'var(--surface-subtle)' }}>
                  {penViolation && penConfirm ? (
                    <>
                      <button onClick={applyPen} style={{ appearance: 'none', cursor: 'pointer', border: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px', fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 600, color: 'var(--accent-contrast)', background: 'var(--accent)', borderRadius: 'var(--radius-sm)', padding: '6px 12px' }}><ED.Icon name="check" size={13} />Trotzdem übernehmen</button>
                      <button onClick={() => setPenConfirm(false)} style={{ appearance: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px', fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 500, color: 'var(--text-muted)', background: 'transparent', border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-sm)', padding: '6px 12px' }}>Abbrechen</button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => (penViolation ? setPenConfirm(true) : applyPen())} style={{ appearance: 'none', cursor: 'pointer', border: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px', fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 600, color: 'var(--accent-contrast)', background: 'var(--accent)', borderRadius: 'var(--radius-sm)', padding: '6px 12px' }}><ED.Icon name="check" size={13} />Übernehmen</button>
                      <button onClick={discardPen} style={{ appearance: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px', fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 500, color: 'var(--text-muted)', background: 'transparent', border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-sm)', padding: '6px 12px' }}><ED.Icon name="x" size={13} />Verwerfen</button>
                      <button onClick={() => runPen(penPending.key, penPending.index)} style={{ appearance: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px', fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 500, color: 'var(--text-muted)', background: 'transparent', border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-sm)', padding: '6px 12px' }}><ED.Icon name="clock" size={13} />Neu</button>
                    </>
                  )}
                </div>
              </div>
            )}
            {/* shared contact */}
            <FormGroup title="Kontakt / Kopfzeile" action={penButton('headline', undefined, 'Headline anpassen')}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <ED.Input label="Name" value={contact.name} onChange={(e) => setC('name', e.target.value)} wrapStyle={{ gridColumn: '1 / -1' }} />
                <ED.Input label="Position" value={contact.role} onChange={(e) => setC('role', e.target.value)} wrapStyle={{ gridColumn: '1 / -1' }} />
                <ED.Input label="E-Mail" value={contact.email} onChange={(e) => setC('email', e.target.value)} />
                <ED.Input label="Telefon" value={contact.phone} onChange={(e) => setC('phone', e.target.value)} />
                <ED.Input label="Standort" value={contact.location} onChange={(e) => setC('location', e.target.value)} />
                <ED.Input label="LinkedIn" value={contact.linkedin} onChange={(e) => setC('linkedin', e.target.value)} />
                <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <ED.Avatar name={contact.name} src={contact.photo || contact.src} size={40} radius="var(--radius-md)" />
                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer', border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-pill)', padding: '5px 12px', fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)' }}>
                    <ED.Icon name="upload" size={12} /> {contact.photo ? 'Foto ersetzen' : 'Foto hochladen'}
                    <input type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => uploadPhoto(e.target.files[0])} />
                  </label>
                  {contact.photo && (
                    <button onClick={() => setC('photo', undefined)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-soft)', textDecoration: 'underline', padding: 0 }}>Entfernen</button>
                  )}
                  {photoMsg && <span style={{ fontSize: '11.5px', color: 'var(--danger)' }}>{photoMsg}</span>}
                </div>
              </div>
            </FormGroup>

            {doc === 'lebenslauf' ? (
              <>
                <FormGroup title="Kurzprofil" action={penButton('summary', undefined, 'Profil anpassen')}>
                  <ED.Textarea rows={4} value={resume.summary} onChange={(e) => setResume((s) => ({ ...s, summary: e.target.value }))} />
                </FormGroup>

                {resume.rawText && (
                  <FormGroup title="Importierter Text (ohne KI)">
                    <ED.Textarea
                      rows={5}
                      value={resume.rawText}
                      onChange={(e) => setResume((s) => ({ ...s, rawText: e.target.value }))}
                    />
                  </FormGroup>
                )}

                <FormGroup title="Berufserfahrung" onAdd={addExp}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {resume.experience.map((e, i) => (
                      <div key={i} style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '12px', background: 'var(--surface-subtle)', display: 'flex', flexDirection: 'column', gap: '9px' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '6px', marginBottom: '-4px' }}>
                          {penButton('experience', i, 'Station anpassen')}
                          <ED.IconButton icon="trash" label="Entfernen" variant="ghost" size="sm" onClick={() => delExp(i)} />
                        </div>
                        <ED.Input label="Position" value={e.role} onChange={(ev) => setExp(i, 'role', ev.target.value)} />
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '9px' }}>
                          <ED.Input label="Unternehmen" value={e.company} onChange={(ev) => setExp(i, 'company', ev.target.value)} />
                          <ED.Input label="Zeitraum" value={e.period} onChange={(ev) => setExp(i, 'period', ev.target.value)} />
                        </div>
                        <ED.Textarea label="Aufgaben (eine pro Zeile)" rows={3} value={e.bullets.join('\n')} onChange={(ev) => setExp(i, 'bullets', ev.target.value.split('\n'))} />
                      </div>
                    ))}
                  </div>
                </FormGroup>

                <FormGroup title="Skills" action={penButton('skills', undefined, 'Skills anpassen')}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {(resume.skillGroups || []).map((g, i) => (
                      <div key={i} style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '12px', background: 'var(--surface-subtle)' }}>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '6px' }}>{g.label || 'Skills'}</div>
                        <div style={{ fontSize: '12.5px', color: 'var(--text-soft)' }}>{(g.items || []).join(', ')}</div>
                      </div>
                    ))}
                    {(!resume.skillGroups || resume.skillGroups.length === 0) && (
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic' }}>Keine Skills hinterlegt.</div>
                    )}
                  </div>
                </FormGroup>

                <FormGroup title="Ausbildung">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {resume.education.map((e, i) => (
                      <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '9px', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '12px', background: 'var(--surface-subtle)' }}>
                        <ED.Input label="Abschluss" value={e.degree} onChange={(ev) => setEdu(i, 'degree', ev.target.value)} wrapStyle={{ gridColumn: '1 / -1' }} />
                        <ED.Input label="Institution" value={e.school} onChange={(ev) => setEdu(i, 'school', ev.target.value)} />
                        <ED.Input label="Zeitraum" value={e.period} onChange={(ev) => setEdu(i, 'period', ev.target.value)} />
                      </div>
                    ))}
                  </div>
                </FormGroup>
              </>
            ) : (
              <>
                <FormGroup title="Empfänger">
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <ED.Input label="Unternehmen" value={letter.firma} onChange={(e) => setLetter((s) => ({ ...s, firma: e.target.value }))} wrapStyle={{ gridColumn: '1 / -1' }} />
                    <ED.Input label="Ansprechpartner:in" value={letter.ansprechpartner} onChange={(e) => setLetter((s) => ({ ...s, ansprechpartner: e.target.value }))} wrapStyle={{ gridColumn: '1 / -1' }} />
                    <ED.Input label="Straße" value={letter.strasse} onChange={(e) => setLetter((s) => ({ ...s, strasse: e.target.value }))} />
                    <ED.Input label="PLZ & Ort" value={letter.plzOrt} onChange={(e) => setLetter((s) => ({ ...s, plzOrt: e.target.value }))} />
                  </div>
                </FormGroup>
                <FormGroup title="Inhalt">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <ED.Input label="Betreff" value={letter.betreff} onChange={(e) => setLetter((s) => ({ ...s, betreff: e.target.value }))} />
                    <ED.Input label="Anrede" value={letter.anrede} onChange={(e) => setLetter((s) => ({ ...s, anrede: e.target.value }))} />
                  </div>
                </FormGroup>
                <FormGroup title="Absätze" onAdd={addPara}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '9px' }}>
                    {letter.absaetze.map((p, i) => <ED.Textarea key={i} rows={3} value={p} onChange={(e) => setPara(i, e.target.value)} />)}
                  </div>
                </FormGroup>
              </>
            )}
          </div>
        </div>

        {/* RIGHT — live preview */}
        <div style={{ background: 'var(--surface-page)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', minHeight: 0, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)' }}>
              <ED.Icon name="eye" size={14} /> Live-Vorschau · {doc === 'lebenslauf' ? 'Lebenslauf' : 'Anschreiben'}
            </span>
            <div style={{ display: 'flex', gap: '8px' }}>
              {hasTool('ai') && aiReady === false && (
                <span style={{ alignSelf: 'center' }}>
                  {window.AiNotConfiguredHint ? (
                    <window.AiNotConfiguredHint compact live={false} />
                  ) : (
                    <button
                      type="button"
                      role="link"
                      onClick={() => onOpenSettings && onOpenSettings()}
                      style={{ appearance: 'none', background: 'none', border: 'none', padding: 0, cursor: 'pointer', textDecoration: 'underline', fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--danger)' }}
                    >
                      KI nicht eingerichtet — in den Einstellungen konfigurieren
                    </button>
                  )}
                </span>
              )}
              {hasTool('ai') && (
                <button onClick={runAI} disabled={aiReady === false} title={aiReady === false ? 'KI nicht eingerichtet — in den Einstellungen konfigurieren' : undefined} style={{ appearance: 'none', cursor: aiReady === false ? 'default' : 'pointer', opacity: aiReady === false ? 0.5 : 1, border: 'none', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontFamily: 'var(--font-body)', fontSize: '12.5px', fontWeight: 600, color: 'var(--accent-contrast)', background: 'var(--accent)', borderRadius: 'var(--radius-md)', padding: isMobile ? '10px 14px' : '7px 12px', minHeight: isMobile ? '44px' : undefined }}>
                  <ED.Icon name="zap" size={14} />KI anpassen
                </button>
              )}
              {hasTool('pdf') && <ED.Button size="sm" variant="outline" iconLeft={<ED.Icon name="download" size={14} />} onClick={handleExportPdf} disabled={pdfBusy}>{pdfBusy ? 'PDF…' : 'PDF'}</ED.Button>}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '8px 16px', borderBottom: '1px solid var(--border)', flexShrink: 0, flexWrap: 'wrap' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-soft)' }}>Stil</span>
            <div style={{ display: 'flex', gap: '4px', background: 'var(--surface-sunk)', borderRadius: 'var(--radius-sm)', padding: '3px' }}>
              {[['classic', 'Classic'], ['modern', 'Modern'], ['compact', 'Compact'], ['ink', 'Ink']].map(([id, label]) => (
                <button key={id} onClick={() => setCfg((c) => ({ ...c, template: id }))} style={{ border: 'none', cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: '11px', fontWeight: cfg.template === id ? 600 : 500, padding: isMobile ? '11px 14px' : '4px 9px', minHeight: isMobile ? '44px' : undefined, borderRadius: '4px', background: cfg.template === id ? 'var(--surface-card)' : 'transparent', color: cfg.template === id ? 'var(--text-heading)' : 'var(--text-muted)' }}>{label}</button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: isMobile ? '10px' : '6px' }}>
              {ED_ACCENTS.map((a, i) => <span key={i} role="button" aria-label={`Akzent ${i + 1}`} onClick={() => setCfg((c) => ({ ...c, accent: a.accent, strong: a.strong, onDark: a.onDark }))} style={{ width: isMobile ? '34px' : '22px', height: isMobile ? '34px' : '22px', borderRadius: '6px', cursor: 'pointer', background: a.accent, border: `2px solid ${cfg.accent === a.accent ? 'var(--text-heading)' : 'transparent'}` }} />)}
            </div>
            <select value={cfg.font} onChange={(e) => setCfg((c) => ({ ...c, font: e.target.value }))} style={{ padding: isMobile ? '10px 10px' : '5px 9px', minHeight: isMobile ? '44px' : undefined, borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-strong)', background: 'var(--surface-card)', fontFamily: 'var(--font-body)', fontSize: isMobile ? '13px' : '12px', color: 'var(--text-heading)' }}>
              <option value="var(--font-display)">Space Grotesk</option>
              <option value="var(--font-body)">Inter</option>
              <option value="Georgia, serif">Georgia</option>
            </select>
            <div style={{ display: 'inline-flex', background: 'var(--surface-sunk)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '2px', gap: '2px' }}>
              {[['S', 0.92], ['M', 1], ['L', 1.08]].map(([l, v]) => <button key={l} onClick={() => setCfg((c) => ({ ...c, size: v }))} style={{ border: 'none', cursor: 'pointer', fontSize: '11px', fontWeight: cfg.size === v ? 600 : 500, padding: isMobile ? '11px 15px' : '4px 9px', minHeight: isMobile ? '44px' : undefined, borderRadius: '4px', background: cfg.size === v ? 'var(--surface-card)' : 'transparent', color: cfg.size === v ? 'var(--text-heading)' : 'var(--text-muted)' }}>{l}</button>)}
            </div>
          </div>
          <div ref={previewRef} style={{ flex: 1, overflowY: 'auto', padding: '28px', display: 'flex', justifyContent: 'center' }}>
            {previewHtml ? (
              <iframe
                ref={frameRef}
                title="Dokumentvorschau"
                srcDoc={previewHtml}
                onLoad={syncFrame}
                scrolling="no"
                style={{ width: `${A4_WIDTH_PX}px`, height: `${frameHeight}px`, border: 'none', zoom: scale, background: 'transparent', flexShrink: 0 }}
              />
            ) : (
              <div style={{ margin: 'auto', fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-soft)' }}>
                Vorschau wird erstellt…
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { Editor });
