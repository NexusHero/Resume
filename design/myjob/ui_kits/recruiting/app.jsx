/* app.jsx — orchestrates the unified myJob workspace. Define-only; render is in index.html. */
const A = window.MyJobDesignSystem_5611b7;

const TITLES = {
  uebersicht: ['Workspace', 'What needs your attention today'],
  mandate: ['Mandates', 'Your mandates — roles, deadlines, fee'],
  pool: ['Candidates', 'The people you support through their applications'],
  matching: ['Job search & Matching', 'Find roles that fit'],
  stellen: ['Jobs', 'Saved job postings'],
  bewerbungen: ['Applications', 'Your applications at a glance'],
  mehr: ['More', 'Agency features and settings'],
  platzierungen: ['Placements', 'Booked placements and fees'],
  berichte: ['Performance', 'Fees, funnel and utilization'],
  assistant: ['CoRecruiter', 'Your AI assistant — prepares the desk, you decide'],
  postfach: ['Inbox', 'Messages from clients and companies'],
  einstellungen: ['Settings', 'Appearance, AI & Workspace'],
};

/* The application-first rail (ADR-0057). The intermediary features are appended
   only when the workspace switch `vermittlung` is on. */
const BASE_NAV = [
  { id: 'uebersicht', label: 'Workspace', icon: 'home' },
  { id: 'pool', label: 'Candidates', icon: 'users' },
  { id: 'stellen', label: 'Jobs', icon: 'briefcase' },
  { id: 'bewerbungen', label: 'Applications', icon: 'columns' },
];

const VERMITTLER_NAV = [
  { id: 'mandate', label: 'Mandates', icon: 'briefcase' },
  { id: 'berichte', label: 'Performance', icon: 'trend' },
  { id: 'postfach', label: 'Inbox', icon: 'inbox' },
];

const SETTINGS_NAV = { id: '__settings', label: 'Settings', icon: 'sliders' };
const MORE_NAV = { id: 'mehr', label: 'More', icon: 'grid' };

/* Which primary destination lights up for a given app state — sub-views
   (Matching, Placements, a profile/editor) highlight their parent. */
function activeNavId(nav, hasTalent, posture, vermittlung) {
  if (hasTalent) return 'pool';
  if (nav === 'stellen' || nav === 'matching') return 'stellen';
  if (posture === 'tabs' && vermittlung) {
    if (['mandate', 'berichte', 'platzierungen', 'postfach', 'assistant', 'einstellungen', 'mehr'].includes(nav)) {
      return 'mehr';
    }
  }
  if (nav === 'einstellungen') return '__settings';
  if (nav === 'platzierungen') return 'berichte';
  return nav;
}

/**
 * Loads a list resource from the API and tracks loading/error state. It does
 * NOT fall back to sample data on failure — the recruiting views must only ever
 * show real records, never fabricated ones. Returns { data, loading, error,
 * reload } so views can render a loading, error (with retry), or empty state.
 */
function useResource(fetcher, opts = {}) {
  const [data, setData] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(false);
  const alive = React.useRef(true);
  React.useEffect(() => () => { alive.current = false; }, []);
  const reload = React.useCallback((reloadOpts) => {
    if (opts.enabled === false) {
      setData([]);
      setLoading(false);
      setError(false);
      return Promise.resolve();
    }
    // Background reload (e.g. on navigation) keeps the current data on screen and
    // refetches silently, so revisiting a view doesn't flash a spinner; a normal
    // reload shows the loading state.
    if (!reloadOpts || !reloadOpts.background) setLoading(true);
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
  }, [fetcher, opts.enabled]);
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
  // The per-workspace intermediary switch (ADR-0057) lives in a shared store:
  // unknown counts as off (no intermediary requests until the server answers).
  const ws = window.useWorkspaceSettings
    ? window.useWorkspaceSettings()
    : { status: 'loaded', vermittlung: false };
  const vermittlung = ws.vermittlung;
  const [openTalent, setOpenTalent] = React.useState(null);
  // Load the switch once; a failed load is retried on focus and navigation.
  React.useEffect(() => {
    if (ws.status === 'unknown') window.WorkspaceSettings.refresh();
  }, [ws.status]);
  React.useEffect(() => {
    if (window.AiStatus && window.AiStatus.get().status === 'unknown') window.AiStatus.refresh();
  }, []);
  React.useEffect(() => {
    if (ws.status !== 'error') return undefined;
    const retry = () => window.WorkspaceSettings.refresh();
    window.addEventListener('focus', retry);
    return () => window.removeEventListener('focus', retry);
  }, [ws.status]);
  const [openPipeline, setOpenPipeline] = React.useState(null); // mandate id whose pipeline is open
  const [openApplication, setOpenApplication] = React.useState(null); // job application being edited
  const [editing, setEditing] = React.useState(null);
  // Which create form is open ('mandate' | 'talent' | 'placement' | null).
  const [formKind, setFormKind] = React.useState(null);
  // Optional seed values for the create form (mandate drafted from a posting).
  const [formPrefill, setFormPrefill] = React.useState(null);
  // The record being edited, as { kind, id, values } — null when not editing.
  const [editRecord, setEditRecord] = React.useState(null);
  // A saved posting the caller asked to open (e.g. "Bereits gespeichert → öffnen"
  // from Matching) — handed to JobPostings once and then cleared.
  const [postingFocus, setPostingFocus] = React.useState(null);
  // The Bewerbungen sub-view: the new list, or the frozen pipeline board (Vermittlung).
  const [bewerbungenSub, setBewerbungenSub] = React.useState('bewerbungen');
  // The Chat-Agent panel (ADR-0062) — a slide-over/sheet, not a nav destination.
  const [agentOpen, setAgentOpen] = React.useState(false);
  // Server-side status filter (AK-4.6); re-fetch on change.
  const [applicationStatus, setApplicationStatus] = React.useState(undefined);
  // Live data sources. Each tracks loading/error and never falls back to
  // fabricated sample data — a recruiter must only ever see real records.
  const listMandates = React.useCallback(() => window.RecruitApi.listMandates(), []);
  const listTalents = React.useCallback(() => window.RecruitApi.listTalents(), []);
  const listPlacements = React.useCallback(() => window.RecruitApi.listPlacements(), []);
  const listApplications = React.useCallback(() => window.RecruitApi.listApplications(), []);
  const listJobPostings = React.useCallback(() => window.RecruitApi.listJobPostings(), []);
  const listJobApplications = React.useCallback(
    () => window.RecruitApi.listJobApplications({ status: applicationStatus }),
    [applicationStatus],
  );
  const mandatesRes = useResource(listMandates, { enabled: vermittlung });
  const talentsRes = useResource(listTalents);
  const placementsRes = useResource(listPlacements, { enabled: vermittlung });
  const applicationsRes = useResource(listApplications);
  const jobPostingsRes = useResource(listJobPostings);
  const jobApplicationsRes = useResource(listJobApplications);

  const mandates = mandatesRes.data;
  const jobPostings = jobPostingsRes.data;
  const jobApplications = jobApplicationsRes.data;
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

  // "Bereits gespeichert → öffnen" from Matching: jump to Stellen and open it.
  const openPosting = (id) => {
    setPostingFocus(id);
    setNav('stellen');
  };

  // Open a job application (new or existing) in the Bewerbungs-Editor (AK-2.1/2.2).
  const openApplicationEditor = (application) => setOpenApplication(application);

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
      label: `Application${company ? ` at ${company}` : ''} removed`,
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
  const goNav = (raw) => {
    const n = raw;
    if (ws.status === 'error') window.WorkspaceSettings.refresh();
    // Commit any pending undo-delete before leaving the view — a queued deletion
    // must not linger silently across a navigation (#200).
    if (window.UndoDelete) window.UndoDelete.flush();
    const res = n === 'pool' ? talentsRes : n === 'mandate' ? mandatesRes : n === 'bewerbungen' ? applicationsRes : n === 'stellen' ? jobPostingsRes : null;
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
        `${ok} CV${ok === 1 ? '' : 's'} imported${failed ? `, ${failed} failed` : ''}.`,
        failed ? 'error' : 'info',
      );
    } catch {
      window.showToast('CV import failed. Please try again.', 'error');
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
        label: 'Placement removed',
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
  const account = { name: (me && me.name) || 'Me', src: me && me.src, meta: `Me · +${Math.max(0, talents.length - 1)} candidates` };
  // Navigation spec (plan §3.6): the rail carries four destinations + the
  // settings foot; the tab bar shows exactly five — settings when the switch is
  // off, a "Mehr" tab (which lists every intermediary destination) when on.
  const navList = isMobile
    ? vermittlung
      ? [...BASE_NAV, MORE_NAV]
      : [...BASE_NAV, SETTINGS_NAV]
    : vermittlung
      ? [...BASE_NAV, ...VERMITTLER_NAV]
      : BASE_NAV;
  const navItems = navList.map((n) => ({ ...n, badge: badges[n.id] }));
  // Targeting the settings surface from inside an editor/dialog: close them
  // first (plan §3.6, `myjob:navigate`).
  React.useEffect(() => {
    const onNavigate = (e) => {
      if (e && e.detail && e.detail.to === 'einstellungen') shellNav('__settings');
    };
    window.addEventListener('myjob:navigate', onNavigate);
    return () => window.removeEventListener('myjob:navigate', onNavigate);
  });
  const shellNav = (n) => {
    if (window.UndoDelete) window.UndoDelete.flush();
    setOpenTalent(null);
    setOpenPipeline(null);
    setOpenApplication(null);
    setEditing(null);
    setFormKind(null);
    setFormPrefill(null);
    setEditRecord(null);
    // Settings + the account chip both land on the settings surface (which
    // carries appearance, AI setup and logout).
    if (n === '__settings' || n === '__account') { setNav('einstellungen'); return; }
    goNav(n);
  };
  const renderShell = ({ active, title: t, subtitle: s, actions: a, search: showSearch = false, children }) => (
    <A.AppShell
      posture={isMobile ? 'tabs' : 'rail'}
      product={vermittlung ? 'recruit' : 'applicant'}
      nav={navItems}
      active={active}
      onNav={shellNav}
      account={account}
      settingsLabel="Settings"
      title={t}
      subtitle={s}
      search={showSearch}
      searchPlaceholder="Candidates, companies, roles …"
      searchValue={search}
      onSearch={setSearch}
      actions={a}
    >
      {children}
    </A.AppShell>
  );

  React.useEffect(() => {
    const hidden = ['mandate', 'platzierungen', 'postfach', 'assistant', 'berichte', 'mehr', 'matching'];
    if (!vermittlung && hidden.includes(nav)) {
      setNav('uebersicht');
      setOpenTalent(null);
      setOpenPipeline(null);
      setOpenApplication(null);
      setEditing(null);
      setFormKind(null);
      setEditRecord(null);
    }
  }, [vermittlung, nav]);

  const goTalent = (id) => setOpenTalent(id);
  const back = () => setOpenTalent(null);
  const goPipeline = (m) => setOpenPipeline(m.id);

  const talent = openTalent && talents.find((t) => t.id === openTalent);
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

  // The Bewerbungs-Editor takes over the whole canvas (AK-2.1).
  if (openApplication) {
    return renderShell({
      active: 'bewerbungen',
      title: `${openApplication.postingCompany} · ${openApplication.postingTitle}`,
      subtitle: `Application for ${openApplication.talentName || 'Candidate'}`,
      children: (
        <window.BewerbungsEditor
          application={openApplication}
          onClose={() => setOpenApplication(null)}
          onChanged={() => jobApplicationsRes.reload()}
        />
      ),
    });
  }

  // editor takes over the whole canvas — it lives inside a candidate profile
  if (editTalent) {
    return renderShell({
      active: 'pool',
      title: editTalent.me ? 'My documents' : editTalent.name,
      subtitle: 'Edit CV & cover letter',
      children: (
        <window.Editor talent={editTalent} onClose={() => setEditing(null)} onOpenSettings={() => { setEditing(null); setOpenTalent(null); setNav('einstellungen'); }} />
      ),
    });
  }

  // a talent profile takes over the whole canvas regardless of nav
  let title, subtitle, body;
  if (talent) {
    title = talent.me ? 'My profile' : talent.name;
    subtitle = 'CV, attachments and applications';
    body = <window.TalentProfile talent={talent} onBack={back} onEdit={() => setEditing(talent.id)} onOpenApplication={openApplicationEditor} />;
  } else {
    // Guard against an unknown nav key — destructuring `undefined` here would
    // white-screen the whole workspace.
    [title, subtitle] = TITLES[nav] || TITLES.uebersicht;
    if (nav === 'uebersicht') body = (
      <window.Dashboard
        me={me}
        apps={apps}
        vkpis={vkpis}
        clients={clients}
        mandates={mandates}
        talentCount={talents.filter((t) => !t.me).length}
        vermittlung={vermittlung}
        onNav={goNav}
        onOpenTalent={goTalent}
        onOpenPipeline={() => goNav('bewerbungen')}
        onOpenMandate={() => goNav('mandate')}
      />
    );
    else if (nav === 'pool') body = withState(talentsRes, <window.TalentGrid talents={shownTalents} apps={apps} onOpen={goTalent} onAdd={addTalent} onImport={importCvs} importing={importing} />);
    else if (nav === 'stellen') body = withState(jobPostingsRes, (
      <window.JobPostings
        postings={jobPostings}
        onSearch={() => goNav('matching')}
        onChanged={() => jobPostingsRes.reload()}
        focusId={postingFocus}
        onFocusConsumed={() => setPostingFocus(null)}
        onOpenApplication={openApplicationEditor}
      />
    ));
    else if (nav === 'matching') body = (
      <window.Matching
        talents={talents}
        mandates={vermittlung ? mandates : undefined}
        onCreateMandate={vermittlung ? mandateFromJob : undefined}
        onOpenPosting={openPosting}
        onAdopted={() => jobPostingsRes.reload()}
      />
    );
    else if (nav === 'bewerbungen') body =
      vermittlung && bewerbungenSub === 'pipeline'
        ? withState(applicationsRes, (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', height: '100%' }}>
            <window.PipelineBoard apps={apps} talents={talents} onOpen={goTalent} onMove={moveApplication} onDelete={deleteApplication} />
          </div>
        ))
        : withState(jobApplicationsRes, (
          <window.Bewerbungen
            applications={jobApplications}
            onOpen={openApplicationEditor}
            onChanged={() => jobApplicationsRes.reload()}
            status={applicationStatus}
            onStatusChange={setApplicationStatus}
          />
        ));
    else if (nav === 'einstellungen') body = <window.SettingsView user={user} onLogout={onLogout} />;
    else if (nav === 'mehr') body = <window.MoreView onNavigate={goNav} />;
    else if (vermittlung && nav === 'mandate') body = withState(mandatesRes, <window.MandateView mandates={shownMandates} onEdit={editMandate} onOpenPipeline={goPipeline} />);
    else if (vermittlung && nav === 'platzierungen') body = withState(placementsRes, <window.PlatzierungenView placements={shownPlacements} kpis={vkpis} onEdit={editPlacement} />);
    else if (vermittlung && nav === 'assistant') body = <window.AssistantView onChanged={() => { mandatesRes.reload(); }} />;
    else if (vermittlung && nav === 'berichte') body = <window.ReportsView clients={reportClients} mandates={mandates} placements={placements} apps={apps} kpis={vkpis} />;
    else if (vermittlung && nav === 'postfach') body = <window.Inbox messages={messages} apps={apps} talents={talents} onOpenTalent={goTalent} />;
    else body = <PlaceholderView title="Not available" text="This view is not enabled in this workspace." />;
  }

  // Topbar actions: a per-view primary (create) for the intermediary views, and
  // the CoRecruiter assistant — a topbar action, not a page. Both only appear
  // when the workspace switch is on (ADR-0057).
  const primaryAction =
    (!talent && vermittlung && nav === 'mandate')
      ? <A.Button variant="primary" size="sm" iconLeft={<A.Icon name="plus" size={15} />} onClick={addMandate}>New mandate</A.Button>
      : (!talent && vermittlung && nav === 'platzierungen')
      ? <A.Button variant="primary" size="sm" iconLeft={<A.Icon name="plus" size={15} />} onClick={addPlacement}>Placement</A.Button>
      : null;
  // The folded-in destinations are proper sub-tabs of their parent view —
  // Matching under Suchaufträge (Stellensuche), Platzierungen under Performance.
  const subTabs =
    !talent && (nav === 'stellen' || nav === 'matching')
      ? <A.Tabs tabs={[{ id: 'stellen', label: 'Saved' }, { id: 'matching', label: 'Find jobs' }]} value={nav} onChange={(id) => goNav(id)} style={{ marginBottom: '18px' }} />
      : !talent && vermittlung && nav === 'bewerbungen'
      ? <A.Tabs tabs={[{ id: 'bewerbungen', label: 'Applications' }, { id: 'pipeline', label: 'Pipeline' }]} value={bewerbungenSub} onChange={(id) => setBewerbungenSub(id)} style={{ marginBottom: '18px' }} />
      : !talent && vermittlung && (nav === 'berichte' || nav === 'platzierungen')
      ? <A.Tabs tabs={[{ id: 'berichte', label: 'Performance' }, { id: 'platzierungen', label: 'Placements' }]} value={nav === 'platzierungen' ? 'platzierungen' : 'berichte'} onChange={(id) => setNav(id)} style={{ marginBottom: '18px' }} />
      : null;
  // The phone app bar is narrow: show only the per-view primary action there;
  // CoRecruiter stays a desktop topbar action so the bar never overflows.
  // The Agent (Chat) is a main-path companion (ADR-0062 §6.7): always visible,
  // NOT vermittlung-gated, rendered before the primary action, icon-only on
  // mobile so the narrow bar does not overflow.
  const agentAction = (
    <A.Button
      variant="ghost"
      size="sm"
      iconLeft={<A.Icon name="message" size={15} />}
      aria-label="Agent"
      data-testid="agent-action"
      onClick={() => setAgentOpen(true)}
    >
      {isMobile ? null : 'Agent'}
    </A.Button>
  );
  const actions = talent ? null : agentOpen ? null : isMobile ? (
    <>
      {agentAction}
      {primaryAction}
    </>
  ) : (
    <>
      {agentAction}
      {vermittlung && nav !== 'assistant' && (
        <A.Button variant="ghost" size="sm" iconLeft={<A.Icon name="zap" size={15} />} onClick={() => setNav('assistant')}>CoRecruiter</A.Button>
      )}
      {primaryAction}
    </>
  );

  return renderShell({
    active: activeNavId(nav, !!talent, isMobile ? 'tabs' : 'rail', vermittlung),
    title,
    subtitle,
    actions,
    search: !talent && (nav === 'pool' || (vermittlung && (nav === 'mandate' || nav === 'berichte'))),
    children: (
      <>
        {ws.status === 'error' && (
          <div role="alert" style={{ marginBottom: '14px', padding: '10px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--danger)', background: 'var(--danger-soft, rgba(200,50,50,0.08))', fontSize: '12.5px', color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <span style={{ flex: 1 }}>Workspace settings could not be loaded.</span>
            <button type="button" onClick={() => window.WorkspaceSettings.refresh()} style={{ cursor: 'pointer', border: '1px solid var(--danger)', background: 'none', color: 'var(--danger)', borderRadius: 'var(--radius-pill)', fontFamily: 'var(--font-mono)', fontSize: '11px', fontWeight: 600, padding: '4px 12px' }}>
              Try again
            </button>
          </div>
        )}
        {subTabs}
        {body}
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
        {agentOpen && (
          <div
            data-testid="agent-panel"
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 1000,
              background: 'rgba(0,0,0,0.35)',
              display: 'flex',
              justifyContent: isMobile ? 'stretch' : 'flex-end',
            }}
            onClick={() => setAgentOpen(false)}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                width: isMobile ? '100%' : '420px',
                height: '100%',
                background: 'var(--surface-raised, #fff)',
                padding: '16px',
                boxSizing: 'border-box',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700 }}>Agent</span>
                <button
                  type="button"
                  data-testid="agent-close"
                  onClick={() => setAgentOpen(false)}
                  style={{ cursor: 'pointer', background: 'none', border: 'none', color: 'var(--text-soft)', fontSize: '18px' }}
                >
                  ×
                </button>
              </div>
              <window.ChatPanel
                onClose={() => setAgentOpen(false)}
                onOpenApplication={(draft) => {
                  setAgentOpen(false);
                  // The draft link carries { jobApplicationId, … }; fetch the full
                  // application and open the Bewerbungs-Editor (AK-5.6).
                  window.RecruitApi.getJobApplication(draft.jobApplicationId)
                    .then(openApplicationEditor)
                    .catch(() => {});
                }}
              />
            </div>
          </div>
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
