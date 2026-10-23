/* app.jsx — orchestrates the unified myJob workspace. Define-only; render is in index.html. */
const A = window.MyJobDesignSystem_5611b7;

const TITLES = {
  uebersicht: ['Workspace', 'Was heute deine Aufmerksamkeit braucht'],
  mandate: ['Suchaufträge', 'Deine Suchaufträge — Stellen, Fristen, Honorar'],
  pool: ['Mandanten', 'Die Personen, die du beim Bewerben begleitest'],
  matching: ['Stellensuche & Matching', 'Passende Rollen finden'],
  stellen: ['Stellen', 'Gespeicherte Stellenanzeigen'],
  bewerbungen: ['Bewerbungen', 'Deine Bewerbungen im Überblick'],
  pipeline: ['Pipeline', 'Alle Bewerbungen über die Stufen hinweg'],
  platzierungen: ['Platzierungen', 'Gebuchte Platzierungen und Honorare'],
  berichte: ['Performance', 'Honorare, Funnel und Auslastung'],
  assistant: ['CoRecruiter', 'Dein KI-Assistent — bereitet den Desk vor, du entscheidest'],
  postfach: ['Postfach', 'Nachrichten von Klienten und Unternehmen'],
  einstellungen: ['Einstellungen', 'Darstellung, KI & Workspace'],
};

/* The application-first rail (ADR-0057). The intermediary features are appended
   only when the workspace switch `vermittlung` is on. */
const BASE_NAV = [
  { id: 'uebersicht', label: 'Workspace', icon: 'home' },
  { id: 'pool', label: 'Mandanten', icon: 'users' },
  { id: 'stellen', label: 'Stellen', icon: 'briefcase' },
  { id: 'bewerbungen', label: 'Bewerbungen', icon: 'columns' },
];

const VERMITTLER_NAV = [
  { id: 'pipeline', label: 'Pipeline', icon: 'columns' },
  { id: 'mandate', label: 'Suchaufträge', icon: 'briefcase' },
  { id: 'berichte', label: 'Performance', icon: 'trend' },
  { id: 'postfach', label: 'Postfach', icon: 'inbox' },
];

/* Which primary destination lights up for a given app state — sub-views
   (Matching, Placements, a profile/editor) highlight their parent. */
function activeNavId(nav, hasTalent) {
  if (hasTalent) return 'pool';
  if (nav === 'matching') return 'mandate';
  if (nav === 'platzierungen') return 'berichte';
  if (nav === 'einstellungen') return '__settings';
  return nav;
}

/**
 * Loads a list resource from the API and tracks loading/error state. It does
 * NOT fall back to sample data on failure — the recruiting views must only ever
 * show real records, never fabricated ones. Returns { data, loading, error,
 * reload } so views can render a loading, error (with retry), or empty state.
 */
function useResource(fetcher) {
  const [data, setData] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(false);
  const alive = React.useRef(true);
  React.useEffect(() => () => { alive.current = false; }, []);
  const reload = React.useCallback((opts) => {
    // Background reload (e.g. on navigation) keeps the current data on screen and
    // refetches silently, so revisiting a view doesn't flash a spinner; a normal
    // reload shows the loading state.
    if (!opts || !opts.background) setLoading(true);
    setError(false);
    return fetcher()
      .then((list) => {
        if (!alive.current) return;
        setData(Array.isArray(list) ? list : []);
        setLoading(false);
      })
      .catch(() => {
        if (!alive.current) return;
        setError(true);
        setLoading(false);
      });
  }, [fetcher]);
  React.useEffect(() => { reload(); }, [reload]);
  return { data, loading, error, reload };
}

/**
 * The recruiter's own pinned "me" profile, derived from the authenticated
 * session — never from hardcoded sample data. A fresh account has no documents
 * or applications yet, so those are empty; the views render honest empty states.
 */
function makeMeProfile(user) {
  // "suhay.sevinc@…" → "Suhay Sevinc". Drop any plus-address subaddress first
  // ("recruiter+test@…" → "Recruiter") and keep letters only, matching the
  // server's derivation so the greeting and the pinned profile never disagree.
  const local = String((user && user.email) || '')
    .split('@')[0]
    .split('+')[0];
  const words = local
    .split(/[._-]+/)
    .map((w) => w.replace(/[^\p{L}]/gu, ''))
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1));
  const name = words.join(' ') || 'Me';
  return {
    id: (user && user.id) || 'me',
    me: true,
    name,
    role: 'Recruiter',
    headline: '',
    location: '',
    email: (user && user.email) || '',
    phone: '',
    linkedin: '',
    availability: '',
    salary: '',
    score: null,
    skills: [],
    resume: null,
    letter: null,
    attachments: [],
  };
}

/* An honest empty state for the application-first destinations that land in
   later phases (Stellen = Phase 1, Bewerbungen = Phase 2). */
function PlaceholderView({ title, text }) {
  return (
    <A.Card>
      <div style={{ padding: '34px 24px', textAlign: 'center' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: '16px', fontWeight: 700, color: 'var(--text-heading)' }}>{title}</div>
        <div style={{ fontSize: '13px', color: 'var(--text-soft)', marginTop: '6px', lineHeight: 1.6 }}>{text}</div>
      </div>
    </A.Card>
  );
}

function Workspace({ user, onLogout }) {
  const { isMobile } = window.useViewport ? window.useViewport() : { isMobile: false };
  const [nav, setNav] = React.useState('uebersicht');
  const [search, setSearch] = React.useState('');
  // The per-workspace intermediary switch (ADR-0057). Off by default; fetched
  // from the server so the rail and the settings card agree.
  const [vermittlung, setVermittlung] = React.useState(false);
  React.useEffect(() => {
    let alive = true;
    window.RecruitApi.getWorkspaceSettings()
      .then((s) => { if (alive) setVermittlung(!!(s && s.vermittlung)); })
      .catch(() => {});
    return () => { alive = false; };
  }, []);
  React.useEffect(() => {
    const onChange = (e) => setVermittlung(!!(e && e.detail));
    window.addEventListener('myjob:workspacechange', onChange);
    return () => window.removeEventListener('myjob:workspacechange', onChange);
  }, []);
  const [openTalent, setOpenTalent] = React.useState(null);
  const [openPipeline, setOpenPipeline] = React.useState(null); // mandate id whose pipeline is open
  const [mappeFor, setMappeFor] = React.useState(null);
  const [editing, setEditing] = React.useState(null);
  // Which create form is open ('mandate' | 'talent' | 'placement' | null).
  const [formKind, setFormKind] = React.useState(null);
  // Optional seed values for the create form (mandate drafted from a posting).
  const [formPrefill, setFormPrefill] = React.useState(null);
  // The record being edited, as { kind, id, values } — null when not editing.
  const [editRecord, setEditRecord] = React.useState(null);
  // Live data sources. Each tracks loading/error and never falls back to
  // fabricated sample data — a recruiter must only ever see real records.
  const listMandates = React.useCallback(() => window.RecruitApi.listMandates(), []);
  const listTalents = React.useCallback(() => window.RecruitApi.listTalents(), []);
  const listPlacements = React.useCallback(() => window.RecruitApi.listPlacements(), []);
  const listApplications = React.useCallback(() => window.RecruitApi.listApplications(), []);
  const mandatesRes = useResource(listMandates);
  const talentsRes = useResource(listTalents);
  const placementsRes = useResource(listPlacements);
  const applicationsRes = useResource(listApplications);

  const mandates = mandatesRes.data;
  // Rows with an undo-pending delete are hidden optimistically (#200); the real
  // DELETE fires when the snackbar times out, and "Undo" un-hides them.
  const [hiddenIds, setHiddenIds] = React.useState(() => new Set());
  const hideRow = (id) => setHiddenIds((s) => new Set(s).add(id));
  const unhideRow = (id) => setHiddenIds((s) => { const n = new Set(s); n.delete(id); return n; });
  const placements = placementsRes.data.filter((p) => !hiddenIds.has(p.id));
  // "me" (the recruiter's own pinned profile) comes from the signed-in session,
  // not from fabricated sample data, so it stays pinned first in the pool.
  const me0 = React.useMemo(() => makeMeProfile(user), [user]);
  // Me is not a pool record, so the server can't merge document skills for it —
  // derive them from my saved documents here so Matching scores me for real. The
  // saved contact name is also the recruiter's real name (they set it in "My
  // documents"), so it replaces the email-derived placeholder in the greeting.
  const [meSkills, setMeSkills] = React.useState([]);
  const [meName, setMeName] = React.useState('');
  React.useEffect(() => {
    let alive = true;
    setMeSkills([]);
    setMeName('');
    window.RecruitApi.getTalentDocuments(me0.id)
      .then((d) => {
        if (!alive || !d) return;
        if (d.contact && d.contact.name && d.contact.name.trim()) setMeName(d.contact.name.trim());
        if (!d.resume) return;
        const skills = [
          ...(d.resume.skillGroups || []).flatMap((g) => g.items || []),
          ...(d.resume.experience || []).flatMap((e) => e.skills || []),
        ];
        setMeSkills([...new Set(skills.map((s) => s.trim()).filter(Boolean))]);
      })
      .catch(() => {});
    return () => { alive = false; };
  }, [me0.id]);
  const talents = React.useMemo(
    () => [{ ...me0, name: meName || me0.name, skills: meSkills }, ...talentsRes.data.filter((t) => !t.me)],
    [me0, meName, meSkills, talentsRes.data],
  );

  const addMandate = () => setFormKind('mandate');
  // Matching hands a live posting over; the mandate form opens pre-filled and
  // carries the ad text so matching/ATS/prep work from day one.
  const mandateFromJob = (job) => {
    setFormPrefill({
      client: job.company || '',
      role: job.title || '',
      location: job.location || '',
      jobText: [
        `${job.title}${job.company ? ' — ' + job.company : ''}`,
        job.location,
        job.req && job.req.length ? `Skills: ${job.req.join(', ')}` : '',
        job.url,
      ]
        .filter(Boolean)
        .join('\n'),
    });
    setFormKind('mandate');
  };
  const addTalent = () => setFormKind('talent');
  const addPlacement = () => setFormKind('placement');

  // Apply on a candidate's behalf from Matching: record the application (which
  // captures the posting's company + role) and refresh the pipeline so it shows
  // up on the Applications board.
  const applyFromMatching = (job, talent, pdfBase64) =>
    window.RecruitApi.applyCandidate(job, talent, pdfBase64).then((app) => {
      applicationsRes.reload();
      return app;
    });

  // Move an application to another pipeline stage (drag or the card's dropdown),
  // then refresh so the board reflects the persisted status.
  const moveApplication = (id, stage) =>
    window.RecruitApi.updateApplicationStage(id, stage)
      .then(() => applicationsRes.reload())
      .catch(() => applicationsRes.reload());

  // Remove a mis-filed application — Undo over Confirm (#200). Hide it now, send
  // the DELETE only when the snackbar times out; "Undo" un-hides it instead.
  const deleteApplication = (id, company) => {
    hideRow(id);
    window.UndoDelete.schedule({
      label: `Bewerbung${company ? ` bei ${company}` : ''} entfernt`,
      commit: () =>
        window.RecruitApi.deleteApplication(id)
          .then(() => applicationsRes.reload())
          .catch(() => applicationsRes.reload())
          .finally(() => unhideRow(id)),
      restore: () => unhideRow(id),
    });
  };

  // Navigate, pulling fresh data for the destination so a teammate's changes on
  // the shared team desk (ADR-0010) show up without a manual reload. Background =
  // the current data stays on screen while it refetches (no spinner flash).
  const goNav = (n) => {
    // Commit any pending undo-delete before leaving the view — a queued deletion
    // must not linger silently across a navigation (#200).
    if (window.UndoDelete) window.UndoDelete.flush();
    const res = n === 'pool' ? talentsRes : n === 'mandate' ? mandatesRes : n === 'bewerbungen' ? applicationsRes : null;
    // Only refresh a view that already loaded cleanly; a failed load keeps its
    // error state + Retry (don't silently re-fetch over it), and an in-flight
    // load is left alone (no stacked requests).
    if (res && !res.error && !res.loading) res.reload({ background: true });
    setNav(n);
  };

  // Bulk CV import: read each PDF to base64, import as talents, report the
  // outcome and refresh the pool.
  const [importing, setImporting] = React.useState(false);
  const importCvs = async (files) => {
    setImporting(true);
    try {
      const items = await Promise.all(
        files.map(
          (file) =>
            new Promise((resolve, reject) => {
              const r = new FileReader();
              r.onload = () => resolve({ dataBase64: String(r.result).split(',')[1] || '', filename: file.name });
              r.onerror = reject;
              r.readAsDataURL(file);
            }),
        ),
      );
      const results = await window.RecruitApi.importTalents(items);
      await talentsRes.reload();
      const ok = results.filter((r) => r.ok).length;
      const failed = results.length - ok;
      window.showToast(
        `${ok} Lebenslauf${ok === 1 ? '' : 'läufe'} importiert${failed ? `, ${failed} fehlgeschlagen` : ''}.`,
        failed ? 'error' : 'info',
      );
    } catch {
      window.showToast('CV-Import fehlgeschlagen. Bitte erneut versuchen.', 'error');
    }
    setImporting(false);
  };

  // The create form modal submits here; each returns the create promise so the
  // modal can show its busy state, then close on success or surface an error.
  const submitForm = (kind, values) => {
    if (kind === 'mandate') return window.RecruitApi.createMandate(values).then(mandatesRes.reload);
    if (kind === 'talent') return window.RecruitApi.createTalent(values).then(talentsRes.reload);
    return window.RecruitApi.createPlacement(values).then(placementsRes.reload);
  };

  // Open the edit form for a record. Mandates already carry form-shaped fields;
  // placements come from the view in their mapped UI shape, so map them back.
  const editMandate = (m) => setEditRecord({ kind: 'mandate', id: m.id, values: m });
  const editPlacement = (p) =>
    setEditRecord({
      kind: 'placement',
      id: p.id,
      values: {
        candidateName: p.candName,
        candidateRole: p.candRole,
        client: p.client,
        start: p.start,
        fee: p.fee,
        status: String(p.status || '').toLowerCase(),
      },
    });

  const submitEdit = ({ kind, id }, values) => {
    if (kind === 'mandate')
      return window.RecruitApi.updateMandate(id, values).then(mandatesRes.reload);
    return window.RecruitApi.updatePlacement(id, values).then(placementsRes.reload);
  };

  // Deleting a record from its edit form. Only placements are deletable from the
  // UI today; the modal shows the Delete affordance only when onDelete is given.
  // Undo over Confirm (#200): hide the placement and close the form now, send the
  // DELETE when the snackbar times out, un-hide on Undo.
  const deleteRecord = ({ kind, id }) => {
    if (kind === 'placement') {
      hideRow(id);
      window.UndoDelete.schedule({
        label: 'Platzierung entfernt',
        commit: () =>
          window.RecruitApi.deletePlacement(id)
            .then(placementsRes.reload)
            .catch(placementsRes.reload)
            .finally(() => unhideRow(id)),
        restore: () => unhideRow(id),
      });
    }
    return Promise.resolve();
  };

  // The topbar search filters the list views (pool, mandates, placements) —
  // a simple contains-match over the fields a recruiter scans for.
  const q = search.trim().toLowerCase();
  const matches = (...fields) => !q || fields.some((f) => String(f || '').toLowerCase().includes(q));
  const shownTalents = talents.filter((t) => matches(t.name, t.role, t.headline, (t.skills || []).join(' ')));
  const shownMandates = mandates.filter((m) => matches(m.client, m.role, m.location));
  const shownPlacements = placements.filter((p) => matches(p.candName, p.candRole, p.client));

  // Render a view, or a loading / error (retry) state while its source resolves.
  const withState = (res, node) =>
    res.loading ? (
      <window.LoadingState />
    ) : res.error ? (
      <window.ErrorState onRetry={res.reload} />
    ) : (
      node
    );

  // Applications come from the live pipeline API; clients and inbox messages
  // have no live recruiting API yet, so those views show honest empty states.
  const apps = applicationsRes.data.filter((a) => !hiddenIds.has(a.id));
  const clients = [];
  const messages = [];
  const me = talents.find((t) => t.me);

  // Übersicht and Berichte run off the same live data the other views use, so
  // their KPIs and fee breakdown track the signed-in recruiter's own portfolio.
  const vkpis = React.useMemo(
    () => window.computeVermittlerKpis(mandates, talents, placements),
    [mandates, talents, placements],
  );
  const reportClients = React.useMemo(
    () => window.deriveReportClients(mandates, placements),
    [mandates, placements],
  );

  const unread = messages.filter((m) => m.unread).length;
  // Hide the count badges at zero — a "0" reads as a pending indicator (like the inbox).
  const badges = { pipeline: apps.filter((a) => a.status !== 'rejected' && a.status !== 'hired').length || undefined, postfach: (vermittlung && unread) || undefined };

  // The one shared shell (AppShell): a floating white rail on desktop, a bottom
  // tab bar on a phone. Settings + account live at the rail foot; the assistant
  // is a topbar action, not a destination. The intermediary destinations only
  // appear when the workspace switch is on (ADR-0057).
  const account = { name: (me && me.name) || 'Me', src: me && me.src, meta: `Me · +${Math.max(0, talents.length - 1)} Mandanten` };
  const navList = vermittlung ? [...BASE_NAV, ...VERMITTLER_NAV] : BASE_NAV;
  const navItems = navList.map((n) => ({ ...n, badge: badges[n.id] }));
  const shellNav = (n) => {
    if (window.UndoDelete) window.UndoDelete.flush();
    setOpenTalent(null);
    setOpenPipeline(null);
    setEditing(null);
    // Settings + the account chip both land on the settings surface (which
    // carries appearance, AI keys and logout).
    if (n === '__settings' || n === '__account') { setNav('einstellungen'); return; }
    goNav(n);
  };
  const renderShell = ({ active, title: t, subtitle: s, actions: a, search: showSearch = false, children }) => (
    <A.AppShell
      posture={isMobile ? 'tabs' : 'rail'}
      product="recruit"
      nav={navItems}
      active={active}
      onNav={shellNav}
      account={account}
      settingsLabel="Einstellungen"
      title={t}
      subtitle={s}
      search={showSearch}
      searchPlaceholder="Mandanten, Firmen, Rollen …"
      searchValue={search}
      onSearch={setSearch}
      actions={a}
    >
      {children}
    </A.AppShell>
  );

  const goTalent = (id) => setOpenTalent(id);
  const back = () => setOpenTalent(null);
  const goPipeline = (m) => setOpenPipeline(m.id);

  const talent = openTalent && talents.find((t) => t.id === openTalent);
  const talentApps = (id) => apps.filter((a) => a.talentId === id);
  const editTalent = editing && talents.find((t) => t.id === editing);

  // a mandate's pipeline board takes over the whole canvas
  const pipelineMandate = openPipeline && mandates.find((m) => m.id === openPipeline);
  if (pipelineMandate) {
    return renderShell({
      active: 'mandate',
      title: `${pipelineMandate.role} · Pipeline`,
      subtitle: pipelineMandate.client,
      children: (
        <window.MandatePipeline
          mandate={pipelineMandate}
          onBack={() => { setOpenPipeline(null); mandatesRes.reload(); }}
          onOpenTalent={(id) => { setOpenPipeline(null); goTalent(id); }}
        />
      ),
    });
  }

  // editor takes over the whole canvas — it lives inside a candidate profile
  if (editTalent) {
    return renderShell({
      active: 'pool',
      title: editTalent.me ? 'Meine Dokumente' : editTalent.name,
      subtitle: 'Lebenslauf & Anschreiben bearbeiten',
      children: (
        <>
          <window.Editor talent={editTalent} onClose={() => setEditing(null)} onCreateMappe={() => { setMappeFor(editTalent); }} onOpenSettings={() => { setEditing(null); setOpenTalent(null); setNav('einstellungen'); }} />
          {mappeFor && <window.ApplyModal target={{ talent: mappeFor }} onClose={() => setMappeFor(null)} />}
        </>
      ),
    });
  }

  // a talent profile takes over the whole canvas regardless of nav
  let title, subtitle, body;
  if (talent) {
    title = talent.me ? 'Mein Profil' : talent.name;
    subtitle = 'Lebenslauf, Anhänge und Bewerbungen';
    body = <window.TalentProfile talent={talent} apps={talentApps(talent.id)} onBack={back} onEdit={() => setEditing(talent.id)} onCreateMappe={() => setMappeFor(talent)} />;
  } else {
    // Guard against an unknown nav key — destructuring `undefined` here would
    // white-screen the whole workspace.
    [title, subtitle] = TITLES[nav] || TITLES.uebersicht;
    if (nav === 'uebersicht') body = <window.Dashboard me={me} apps={apps} vkpis={vkpis} clients={clients} mandates={mandates} talentCount={talents.filter((t) => !t.me).length} vermittlung={vermittlung} onNav={setNav} onOpenTalent={goTalent} onOpenPipeline={() => setNav('pipeline')} onOpenMandate={() => setNav('mandate')} />;
    else if (nav === 'pool') body = withState(talentsRes, <window.TalentGrid talents={shownTalents} apps={apps} onOpen={goTalent} onAdd={addTalent} onImport={importCvs} importing={importing} />);
    else if (nav === 'stellen') body = <PlaceholderView title="Noch keine Stellen" text="Hier sammelst du deine Stellen. In Phase 1 kannst du eine Stelle aus der Suche übernehmen oder per URL bzw. Text einfügen." />;
    else if (nav === 'bewerbungen') body = <PlaceholderView title="Noch keine Bewerbungen" text="Hier entstehen deine Bewerbungen. In Phase 2 wählst du zu einer Stelle einen Mandanten und erstellst deine eigene Dokumentkopie." />;
    else if (nav === 'einstellungen') body = <window.SettingsView user={user} onLogout={onLogout} />;
    else if (vermittlung && nav === 'mandate') body = withState(mandatesRes, <window.MandateView mandates={shownMandates} onEdit={editMandate} onOpenPipeline={goPipeline} />);
    else if (vermittlung && nav === 'matching') body = <window.Matching talents={talents} mandates={mandates} onCreateMandate={mandateFromJob} onApply={applyFromMatching} />;
    else if (vermittlung && nav === 'pipeline') body = withState(applicationsRes, (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', height: '100%' }}>
        <window.PipelineBoard apps={apps} talents={talents} onOpen={goTalent} onMove={moveApplication} onDelete={deleteApplication} />
      </div>
    ));
    else if (vermittlung && nav === 'platzierungen') body = withState(placementsRes, <window.PlatzierungenView placements={shownPlacements} kpis={vkpis} onEdit={editPlacement} />);
    else if (vermittlung && nav === 'assistant') body = <window.AssistantView onChanged={() => { mandatesRes.reload(); }} />;
    else if (vermittlung && nav === 'berichte') body = <window.ReportsView clients={reportClients} mandates={mandates} placements={placements} apps={apps} kpis={vkpis} />;
    else if (vermittlung && nav === 'postfach') body = <window.Inbox messages={messages} apps={apps} talents={talents} onOpenTalent={goTalent} />;
    else body = <PlaceholderView title="Nicht verfügbar" text="Diese Ansicht ist in diesem Workspace nicht aktiviert." />;
  }

  // Topbar actions: a per-view primary (create) for the intermediary views, and
  // the CoRecruiter assistant — a topbar action, not a page. Both only appear
  // when the workspace switch is on (ADR-0057).
  const primaryAction =
    (!talent && vermittlung && nav === 'mandate')
      ? <A.Button variant="primary" size="sm" iconLeft={<A.Icon name="plus" size={15} />} onClick={addMandate}>Neuer Suchauftrag</A.Button>
      : (!talent && vermittlung && nav === 'platzierungen')
      ? <A.Button variant="primary" size="sm" iconLeft={<A.Icon name="plus" size={15} />} onClick={addPlacement}>Platzierung</A.Button>
      : null;
  // The folded-in destinations are proper sub-tabs of their parent view —
  // Matching under Suchaufträge (Stellensuche), Platzierungen under Performance.
  const subTabs =
    !talent && vermittlung && (nav === 'mandate' || nav === 'matching')
      ? <A.Tabs tabs={[{ id: 'mandate', label: 'Suchaufträge' }, { id: 'matching', label: 'Stellensuche' }]} value={nav === 'matching' ? 'matching' : 'mandate'} onChange={(id) => setNav(id)} style={{ marginBottom: '18px' }} />
      : !talent && vermittlung && (nav === 'berichte' || nav === 'platzierungen')
      ? <A.Tabs tabs={[{ id: 'berichte', label: 'Performance' }, { id: 'platzierungen', label: 'Platzierungen' }]} value={nav === 'platzierungen' ? 'platzierungen' : 'berichte'} onChange={(id) => setNav(id)} style={{ marginBottom: '18px' }} />
      : null;
  // The phone app bar is narrow: show only the per-view primary action there;
  // CoRecruiter stays a desktop topbar action so the bar never overflows.
  const actions = talent ? null : isMobile ? (
    primaryAction
  ) : (
    <>
      {vermittlung && nav !== 'assistant' && (
        <A.Button variant="ghost" size="sm" iconLeft={<A.Icon name="zap" size={15} />} onClick={() => setNav('assistant')}>CoRecruiter</A.Button>
      )}
      {primaryAction}
    </>
  );

  return renderShell({
    active: activeNavId(nav, !!talent),
    title,
    subtitle,
    actions,
    search: !talent && (nav === 'pool' || (vermittlung && (nav === 'mandate' || nav === 'berichte'))),
    children: (
      <>
        {subTabs}
        {body}
        {mappeFor && <window.ApplyModal target={{ talent: mappeFor }} onClose={() => setMappeFor(null)} />}
        {formKind && (
          <window.RecordFormModal
            kind={formKind}
            prefill={formPrefill}
            onClose={() => { setFormKind(null); setFormPrefill(null); }}
            onSubmit={(values) => submitForm(formKind, values)}
          />
        )}
        {editRecord && (
          <window.RecordFormModal
            kind={editRecord.kind}
            record={editRecord.values}
            onClose={() => setEditRecord(null)}
            onSubmit={(values) => submitEdit(editRecord, values)}
            onDelete={editRecord.kind === 'placement' ? () => deleteRecord(editRecord) : undefined}
          />
        )}
      </>
    ),
  });
}

/* Auth gate: probe the session, then render either the login screen or the
   workspace. The recruiting UI is only mounted once a user is present. */
function App() {
  const [auth, setAuth] = React.useState({ status: 'loading', user: null });
  const [providers, setProviders] = React.useState({ google: false, linkedin: false });
  // Result of a ?verify_token= link click — shown on the login screen.
  const [verifyNotice, setVerifyNotice] = React.useState(null);

  // Dismiss the boot splash (index.html) once the session is resolved. A small
  // minimum on-screen time keeps the animation from flashing when auth is instant.
  React.useEffect(() => {
    if (auth.status === 'loading') return undefined;
    const el = typeof document !== 'undefined' && document.getElementById('splash');
    if (!el) return undefined;
    const elapsed = typeof performance !== 'undefined' && performance.now ? performance.now() : 900;
    const t = setTimeout(() => {
      el.classList.add('splash-hide');
      const remove = () => el.remove();
      el.addEventListener('transitionend', remove, { once: true });
      setTimeout(remove, 700); // fallback if transitionend never fires
    }, Math.max(0, 900 - elapsed));
    return () => clearTimeout(t);
  }, [auth.status]);

  React.useEffect(() => {
    let alive = true;
    // An emailed verification link opens the app with ?verify_token= — confirm
    // it first (works signed-in or out), then load the session so verifiedAt
    // is already stamped when /auth/me answers.
    const verifyToken = (() => {
      try { return new URLSearchParams(window.location.search).get('verify_token') || ''; }
      catch { return ''; }
    })();
    const verify = verifyToken
      ? window.RecruitApi.confirmEmailVerification(verifyToken)
          .then(() => { if (alive) setVerifyNotice({ ok: true, text: 'Your email address is confirmed.' }); })
          .catch((e) => { if (alive) setVerifyNotice({ ok: false, text: (e && e.message) || 'Verification failed.' }); })
          .finally(() => {
            try { window.history.replaceState({}, '', window.location.pathname); } catch { /* ignore */ }
          })
      : Promise.resolve();
    window.RecruitApi.authProviders()
      .then((p) => { if (alive) setProviders(p); })
      .catch(() => {});
    verify.then(() =>
      window.RecruitApi.authMe()
        .then((user) => { if (alive) setAuth({ status: 'ready', user }); })
        .catch(() => { if (alive) setAuth({ status: 'ready', user: null }); }),
    );
    return () => { alive = false; };
  }, []);

  if (auth.status === 'loading') return null;
  if (!auth.user) {
    return (
      <React.Fragment>
        <window.OfflineBanner />
        <window.LoginScreen
          providers={providers}
          initialNotice={verifyNotice ? verifyNotice.text : null}
          onAuthed={(user) => setAuth({ status: 'ready', user })}
        />
      </React.Fragment>
    );
  }

  const onLogout = () =>
    window.RecruitApi.authLogout()
      .catch(() => {})
      .then(() => setAuth({ status: 'ready', user: null }));

  return (
    <React.Fragment>
      <window.OfflineBanner />
      <Workspace user={auth.user} onLogout={onLogout} />
      <window.Snackbar />
      <window.Toast />
    </React.Fragment>
  );
}

Object.assign(window, { App, Workspace });
