/* SettingsView — AI models & API keys. The active model is wired to the live
   /settings/llm endpoint; per-provider API keys are stored encrypted on the
   server (PUT/DELETE /settings/keys/:provider) — never in the browser. German-first. */
const SV = window.MyJobDesignSystem_5611b7;

function ProviderRow({ p, active, onActivate, saved, onSave, onRemove }) {
  const [draft, setDraft] = React.useState('');
  const [reveal, setReveal] = React.useState(false);
  const { isMobile } = useViewport();
  const connected = Boolean(saved) || p.available;
  return (
    // On phones the three columns (name · key · controls) can't fit side by side —
    // stack them so the key input and the Active/Remove controls each get full width.
    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'minmax(0,1fr) minmax(0,1.3fr) auto', gap: isMobile ? '12px' : '16px', alignItems: 'center', padding: '16px 0', borderBottom: '1px solid var(--border)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
        <span style={{ width: '36px', height: '36px', flexShrink: 0, borderRadius: 'var(--radius-md)', display: 'grid', placeItems: 'center', background: 'var(--accent-soft)', color: 'var(--accent-strong)', fontFamily: 'var(--font-display)', fontWeight: 700 }}>{p.label.charAt(0).toUpperCase()}</span>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-heading)' }}>
            {p.label}
            {connected && <span style={{ marginLeft: '8px', fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--status-hired-strong)', background: 'var(--status-hired-soft)', border: '1px solid var(--status-hired-border)', borderRadius: 'var(--radius-pill)', padding: '1px 8px' }}>Verbunden</span>}
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11.5px', color: 'var(--text-soft)' }}>{p.id}</div>
        </div>
      </div>

      {saved ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-muted)' }}>{'•'.repeat(18)}</span>
          <span style={{ fontSize: '11px', color: 'var(--text-soft)' }}>Sicher auf dem Server gespeichert</span>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: '8px', minWidth: 0 }}>
          <input type={reveal ? 'text' : 'password'} value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={`${p.label} API-Schlüssel`} autoComplete="off" spellCheck="false" aria-label={`${p.label} API-Schlüssel`} style={{ flex: 1, minWidth: 0, border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-md)', background: 'var(--surface-card)', fontFamily: 'var(--font-mono)', fontSize: '12.5px', color: 'var(--text-heading)', padding: '9px 11px', outline: 'none' }} />
          <button type="button" onClick={() => setReveal((r) => !r)} aria-label={reveal ? 'Schlüssel verbergen' : 'Schlüssel anzeigen'} style={{ cursor: 'pointer', border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-md)', background: 'var(--surface-card)', color: 'var(--text-muted)', padding: '0 11px' }}><SV.Icon name="eye" size={15} /></button>
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', justifyContent: isMobile ? 'space-between' : 'flex-end' }}>
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: active ? 'var(--text-heading)' : 'var(--text-soft)', cursor: 'pointer', whiteSpace: 'nowrap' }}>
          <input type="radio" name="active-provider" checked={active} onChange={onActivate} /> Aktiv
        </label>
        {saved ? (
          <button type="button" onClick={onRemove} style={{ cursor: 'pointer', background: 'none', border: 'none', color: 'var(--danger)', fontWeight: 600, fontSize: '12.5px' }}>Entfernen</button>
        ) : (
          <SV.Button size="sm" disabled={draft.trim().length === 0} onClick={() => { onSave(draft.trim()); setDraft(''); setReveal(false); }}>Schlüssel speichern</SV.Button>
        )}
      </div>
    </div>
  );
}

/* Data & privacy (DSGVO): export everything you own, or erase your account. */
function DataPrivacyCard() {
  const [busy, setBusy] = React.useState(''); // '' | 'export' | 'delete'
  const [error, setError] = React.useState('');
  const [confirm, setConfirm] = React.useState(false);

  const exportData = () => {
    setBusy('export');
    setError('');
    window.RecruitApi.exportAccount()
      .then((data) => {
        // Offer the payload as a downloadable JSON file.
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'myjob-export.json';
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      })
      .catch(() => setError('Deine Daten konnten nicht exportiert werden. Bitte versuche es erneut.'))
      .finally(() => setBusy(''));
  };

  const deleteAccount = () => {
    setBusy('delete');
    setError('');
    window.RecruitApi.deleteAccount()
      .then(() => {
        // The session is gone server-side; re-probe sends us to the login screen.
        window.location.reload();
      })
      .catch(() => {
        setError('Dein Konto konnte nicht gelöscht werden. Bitte versuche es erneut.');
        setBusy('');
        setConfirm(false);
      });
  };

  return (
    <div style={{ background: 'var(--surface-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-sm)', padding: '22px 24px' }}>
      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 700, color: 'var(--text-heading)', margin: 0, letterSpacing: '-0.01em' }}>Daten &amp; Datenschutz</h2>
      <div style={{ fontSize: '12.5px', color: 'var(--text-soft)', marginTop: '2px' }}>Deine DSGVO-Rechte: Hol dir eine Kopie von allem, was du hier speicherst, oder lösche dein Konto endgültig.</div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', padding: '16px 0', borderBottom: '1px solid var(--border)', marginTop: '8px' }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-heading)' }}>Meine Daten exportieren</div>
          <div style={{ fontSize: '12px', color: 'var(--text-soft)', marginTop: '1px' }}>Lade dein Konto, Mandate, Talente und Platzierungen als JSON herunter.</div>
        </div>
        <SV.Button size="sm" variant="outline" disabled={busy !== ''} onClick={exportData}>
          {busy === 'export' ? 'Wird vorbereitet…' : 'Exportieren'}
        </SV.Button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', padding: '16px 0' }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-heading)' }}>Mein Konto löschen</div>
          <div style={{ fontSize: '12px', color: 'var(--text-soft)', marginTop: '1px' }}>Löscht dein Konto und alle Daten, die dir gehören, dauerhaft. Das kann nicht rückgängig gemacht werden.</div>
        </div>
        {confirm ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
            <button type="button" onClick={() => setConfirm(false)} disabled={busy !== ''} style={{ cursor: 'pointer', background: 'none', border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-md)', color: 'var(--text-muted)', fontSize: '12.5px', padding: '7px 12px' }}>Abbrechen</button>
            <button type="button" onClick={deleteAccount} disabled={busy !== ''} style={{ cursor: 'pointer', background: 'var(--danger)', border: '1px solid var(--danger)', borderRadius: 'var(--radius-md)', color: '#fff', fontWeight: 600, fontSize: '12.5px', padding: '7px 12px' }}>{busy === 'delete' ? 'Wird gelöscht…' : 'Löschen bestätigen'}</button>
          </div>
        ) : (
          <button type="button" onClick={() => setConfirm(true)} style={{ cursor: 'pointer', background: 'none', border: '1px solid var(--status-rejected-border)', borderRadius: 'var(--radius-md)', color: 'var(--danger)', fontWeight: 600, fontSize: '12.5px', padding: '7px 12px', flexShrink: 0 }}>Konto löschen</button>
        )}
      </div>

      {error && <div role="alert" style={{ fontSize: '12.5px', color: 'var(--danger)', marginTop: '4px' }}>{error}</div>}
    </div>
  );
}

const TEAM_ROLES = ['admin', 'recruiter'];

function RoleBadge({ role }) {
  const admin = role === 'admin';
  return (
    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', color: admin ? 'var(--accent-strong)' : 'var(--text-soft)', background: admin ? 'var(--accent-soft)' : 'var(--surface-sunk)', border: '1px solid var(--border)', borderRadius: 'var(--radius-pill)', padding: '1px 8px', marginRight: '5px' }}>{role}</span>
  );
}

/* TeamCard — who's on the team and (for admins) which roles they hold. */
function TeamCard() {
  const [me, setMe] = React.useState(null);
  const [members, setMembers] = React.useState(null); // null = loading, [] = none/forbidden
  const [note, setNote] = React.useState('');

  const load = React.useCallback(() => {
    // Resolve the role first; the member list is admin-only, so only admins
    // request it — non-admins never fire a call that would 403.
    window.RecruitApi.authMe()
      .then((who) => {
        setMe(who);
        if (who && who.roles && who.roles.includes('admin')) {
          return window.RecruitApi.listMembers().then(setMembers).catch(() => setMembers([]));
        }
        setMembers([]);
      })
      .catch(() => setMembers([]));
  }, []);
  React.useEffect(() => load(), [load]);

  const isAdmin = !!(me && me.roles && me.roles.includes('admin'));

  const toggleRole = async (member, role) => {
    if (!isAdmin) return;
    const has = member.roles.includes(role);
    const next = has ? member.roles.filter((r) => r !== role) : [...member.roles, role];
    if (next.length === 0) return; // a member keeps at least one role
    setNote('');
    try {
      const updated = await window.RecruitApi.setMemberRoles(member.id, next);
      setMembers((ms) => ms.map((m) => (m.id === member.id ? updated : m)));
    } catch {
      setNote('Rollen konnten nicht aktualisiert werden — das Team muss mindestens einen Admin behalten.');
      load();
    }
  };

  return (
    <div style={{ background: 'var(--surface-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-sm)', padding: '22px 24px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
        <div style={{ flex: 1 }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 700, color: 'var(--text-heading)', margin: 0, letterSpacing: '-0.01em' }}>Team & Rollen</h2>
          <div style={{ fontSize: '12.5px', color: 'var(--text-soft)', marginTop: '2px' }}>Alle in dieser Instanz teilen sich einen Workspace. {isAdmin ? 'Als Admin kannst du Rollen ändern.' : 'Nur Admins können Rollen ändern.'}</div>
        </div>
        {me && <span style={{ flexShrink: 0, fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-soft)' }}>Du: {(me.roles || []).join(', ')}</span>}
      </div>

      {isAdmin && members && members.length > 0 ? (
        <div style={{ marginTop: '14px' }}>
          {members.map((m) => (
            <div key={m.id} style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) auto', gap: '14px', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--text-heading)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.email}{me && m.id === me.id && <span style={{ color: 'var(--text-soft)', fontWeight: 400 }}> (du)</span>}</div>
              </div>
              <div style={{ display: 'flex', gap: '14px', justifyContent: 'flex-end' }}>
                {TEAM_ROLES.map((role) => (
                  <label key={role} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', color: m.roles.includes(role) ? 'var(--text-heading)' : 'var(--text-soft)', cursor: 'pointer' }}>
                    <input type="checkbox" checked={m.roles.includes(role)} onChange={() => toggleRole(m, role)} /> {role}
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ marginTop: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {me && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
              <span style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--text-heading)' }}>{me.email}</span>
              <span style={{ marginLeft: 'auto' }}>{(me.roles || []).map((r) => <RoleBadge key={r} role={r} />)}</span>
            </div>
          )}
          {!isAdmin && <div style={{ fontSize: '12.5px', color: 'var(--text-soft)' }}>Wende dich an einen Admin, um Teamrollen zu ändern.</div>}
        </div>
      )}

      {note && <div role="alert" style={{ fontSize: '12.5px', color: 'var(--danger)', marginTop: '10px' }}>{note}</div>}
    </div>
  );
}

/* InvitesCard — admin-only tenant onboarding (ADR-0035): invite a colleague by
   email into this workspace with a role, and see pending invitations. The
   returned accept link is shown so it can be shared even without SMTP. */
function InvitesCard() {
  const [isAdmin, setIsAdmin] = React.useState(null); // null = unknown
  const [invites, setInvites] = React.useState(null); // null = loading
  const [email, setEmail] = React.useState('');
  const [roles, setRoles] = React.useState(['recruiter']);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState('');
  const [lastLink, setLastLink] = React.useState('');

  const reload = React.useCallback(() => {
    return window.RecruitApi.listInvites().then(setInvites).catch(() => setInvites([]));
  }, []);

  React.useEffect(() => {
    let alive = true;
    // The invite endpoints are admin-only; resolve the role first so a non-admin
    // never fires a call that would 403.
    window.RecruitApi.authMe()
      .then((me) => {
        const admin = !!(me && me.roles && me.roles.includes('admin'));
        if (!alive) return;
        setIsAdmin(admin);
        if (admin) reload();
      })
      .catch(() => { if (alive) { setIsAdmin(false); } });
    return () => { alive = false; };
  }, [reload]);

  const toggleRole = (role) => {
    setRoles((rs) => {
      const next = rs.includes(role) ? rs.filter((r) => r !== role) : [...rs, role];
      return next.length ? next : rs; // keep at least one role
    });
  };

  const submit = async (e) => {
    e.preventDefault();
    if (busy || !email.trim()) return;
    setBusy(true);
    setError('');
    setLastLink('');
    try {
      const { acceptUrl } = await window.RecruitApi.createInvite(email.trim(), roles);
      setLastLink(acceptUrl || '');
      setEmail('');
      await reload();
    } catch (err) {
      setError((err && err.message) || 'Die Einladung konnte nicht gesendet werden.');
    }
    setBusy(false);
  };

  if (isAdmin === false) return null; // inviting is admin-only

  const fieldStyle = { flex: 1, minWidth: 0, border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-md)', background: 'var(--surface-card)', fontSize: '13px', color: 'var(--text-heading)', padding: '9px 11px', outline: 'none' };

  return (
    <div style={{ background: 'var(--surface-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-sm)', padding: '22px 24px' }}>
      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 700, color: 'var(--text-heading)', margin: 0, letterSpacing: '-0.01em' }}>Kolleg:in einladen</h2>
      <div style={{ fontSize: '12.5px', color: 'var(--text-soft)', marginTop: '2px' }}>Sende eine E-Mail-Einladung in diesen Workspace. Die Person legt ein Passwort fest und landet mit den von dir gewählten Rollen in deinem Team.</div>

      <form onSubmit={submit} style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '10px', marginTop: '14px' }}>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="kollegin@example.com" aria-label="E-Mail für Einladung" autoComplete="off" style={fieldStyle} />
        {TEAM_ROLES.map((role) => (
          <label key={role} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', color: roles.includes(role) ? 'var(--text-heading)' : 'var(--text-soft)', cursor: 'pointer' }}>
            <input type="checkbox" checked={roles.includes(role)} onChange={() => toggleRole(role)} /> {role}
          </label>
        ))}
        <SV.Button size="sm" disabled={busy || email.trim().length === 0} onClick={submit}>{busy ? 'Wird gesendet…' : 'Einladung senden'}</SV.Button>
      </form>

      {error && <div role="alert" style={{ fontSize: '12.5px', color: 'var(--danger)', marginTop: '10px' }}>{error}</div>}
      {lastLink && (
        <div style={{ marginTop: '12px', padding: '10px 12px', background: 'var(--surface-sunk)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
          <div style={{ fontSize: '11.5px', color: 'var(--text-soft)', marginBottom: '4px' }}>Einladung gesendet. Falls keine E-Mail konfiguriert ist, teile diesen Link:</div>
          <input readOnly value={lastLink} aria-label="Einladungslink" onFocus={(e) => e.target.select()} style={{ width: '100%', border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-sm)', background: 'var(--surface-card)', fontFamily: 'var(--font-mono)', fontSize: '11.5px', color: 'var(--text-heading)', padding: '6px 8px' }} />
        </div>
      )}

      {invites && invites.length > 0 && (
        <div style={{ marginTop: '14px' }}>
          {invites.map((i) => (
            <div key={i.email} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
              <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-heading)', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{i.email}</span>
              <span style={{ marginLeft: 'auto', display: 'inline-flex', gap: '5px' }}>{(i.roles || []).map((r) => <RoleBadge key={r} role={r} />)}</span>
              <span style={{ flexShrink: 0, fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--text-soft)' }}>Ausstehend</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* TenantMembers — the expanded cross-tenant member list inside SuperAdminCard.
   A super-admin can re-role any tenant's members (ADR-0038). */
function TenantMembers({ tenantId }) {
  const [members, setMembers] = React.useState(null); // null = loading
  const [note, setNote] = React.useState('');

  const load = React.useCallback(() => {
    window.RecruitApi.listTenantMembers(tenantId).then(setMembers).catch(() => setMembers([]));
  }, [tenantId]);
  React.useEffect(() => load(), [load]);

  const toggleRole = async (m, role) => {
    const has = m.roles.includes(role);
    const next = has ? m.roles.filter((r) => r !== role) : [...m.roles, role];
    if (next.length === 0) return;
    setNote('');
    try {
      const updated = await window.RecruitApi.setTenantMemberRoles(tenantId, m.id, next);
      setMembers((ms) => ms.map((x) => (x.id === m.id ? updated : x)));
    } catch {
      setNote('Rollen konnten nicht aktualisiert werden — der Mandant muss mindestens einen Admin behalten.');
      load();
    }
  };

  if (members === null) return <div style={{ padding: '8px 0', fontSize: '12px', color: 'var(--text-soft)' }}>Mitglieder werden geladen…</div>;
  return (
    <div style={{ padding: '4px 0 8px 12px' }}>
      {members.map((m) => (
        <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '6px 0' }}>
          <span style={{ fontSize: '12.5px', color: 'var(--text-heading)', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.email}</span>
          <span style={{ marginLeft: 'auto', display: 'inline-flex', gap: '12px' }}>
            {TEAM_ROLES.map((role) => (
              <label key={role} style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '12px', color: m.roles.includes(role) ? 'var(--text-heading)' : 'var(--text-soft)', cursor: 'pointer' }}>
                <input type="checkbox" aria-label={`Rolle ${role} für ${m.email}`} checked={m.roles.includes(role)} onChange={() => toggleRole(m, role)} /> {role}
              </label>
            ))}
          </span>
        </div>
      ))}
      {note && <div role="alert" style={{ fontSize: '12px', color: 'var(--danger)', marginTop: '4px' }}>{note}</div>}
    </div>
  );
}

/* SuperAdminCard — the instance operator's console (ADR-0037/0038). Shown only to
   super-admins (SUPER_ADMIN_EMAIL): every workspace with its member count and
   status, a suspend/reactivate toggle, and per-tenant member role management. */
function SuperAdminCard() {
  const [isSuper, setIsSuper] = React.useState(null); // null = unknown
  const [tenants, setTenants] = React.useState(null); // null = loading
  const [busy, setBusy] = React.useState('');
  const [expanded, setExpanded] = React.useState('');

  const reload = React.useCallback(() => {
    return window.RecruitApi.listTenants().then(setTenants).catch(() => setTenants([]));
  }, []);

  React.useEffect(() => {
    let alive = true;
    // The console is super-admin-only; resolve the capability first so a normal
    // user never fires a call that would 403.
    window.RecruitApi.authMe()
      .then((me) => {
        const su = !!(me && me.isSuperAdmin);
        if (!alive) return;
        setIsSuper(su);
        if (su) reload();
      })
      .catch(() => { if (alive) setIsSuper(false); });
    return () => { alive = false; };
  }, [reload]);

  const setStatus = async (t, status) => {
    setBusy(t.id);
    try {
      await window.RecruitApi.setTenantStatus(t.id, status);
      await reload();
    } catch {
      /* leave the row as-is; a reload would clear an optimistic state anyway */
    }
    setBusy('');
  };

  if (isSuper === false) return null; // console is super-admin-only

  return (
    <div style={{ background: 'var(--surface-card)', border: '1px solid var(--accent-border, var(--border-strong))', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-sm)', padding: '22px 24px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
        <div style={{ flex: 1 }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 700, color: 'var(--text-heading)', margin: 0, letterSpacing: '-0.01em' }}>Plattform — alle Workspaces</h2>
          <div style={{ fontSize: '12.5px', color: 'var(--text-soft)', marginTop: '2px' }}>Instanz-Super-Admin. Jeder Mandant in diesem Deployment; sperre einen, um seine Mitglieder sofort auszusperren, oder ändere die Rollen eines Mitglieds.</div>
        </div>
        <span style={{ flexShrink: 0, fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--accent-strong)', background: 'var(--accent-soft)', border: '1px solid var(--accent-border, var(--border))', borderRadius: 'var(--radius-pill)', padding: '3px 9px' }}>Super-Admin</span>
      </div>

      {tenants === null ? (
        <div style={{ padding: '22px', textAlign: 'center', color: 'var(--text-soft)', fontSize: '13px' }}>Wird geladen…</div>
      ) : tenants.length === 0 ? (
        <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-soft)', fontSize: '13px' }}>Noch keine Mandanten.</div>
      ) : (
        <div style={{ marginTop: '12px' }}>
          {tenants.map((t) => {
            const suspended = t.status === 'suspended';
            const open = expanded === t.id;
            return (
              <div key={t.id} style={{ borderBottom: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 0' }}>
                  <button type="button" onClick={() => setExpanded(open ? '' : t.id)} style={{ cursor: 'pointer', background: 'none', border: 'none', padding: 0, fontFamily: 'var(--font-display)', fontSize: '13.5px', fontWeight: 600, color: 'var(--text-heading)', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'left' }}>
                    {open ? '▾ ' : '▸ '}{t.name}
                  </button>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-soft)' }}>{t.memberCount} Mitglied{t.memberCount === 1 ? '' : 'er'}</span>
                  <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.04em', textTransform: 'uppercase', color: suspended ? 'var(--danger)' : 'var(--status-hired-strong)', background: suspended ? 'var(--danger-soft, rgba(200,50,50,0.08))' : 'var(--status-hired-soft)', border: `1px solid ${suspended ? 'var(--danger)' : 'var(--status-hired-border)'}`, borderRadius: 'var(--radius-pill)', padding: '1px 8px' }}>{suspended ? 'Gesperrt' : 'Aktiv'}</span>
                  <button type="button" disabled={busy === t.id || t.id === 'team'} title={t.id === 'team' ? 'Das Standardteam kann nicht gesperrt werden' : ''} onClick={() => setStatus(t, suspended ? 'active' : 'suspended')} style={{ cursor: busy === t.id || t.id === 'team' ? 'default' : 'pointer', border: `1px solid ${suspended ? 'var(--status-hired-border)' : 'var(--status-rejected-border)'}`, borderRadius: 'var(--radius-pill)', background: 'none', color: suspended ? 'var(--status-hired-strong)' : 'var(--danger)', fontFamily: 'var(--font-mono)', fontSize: '11px', fontWeight: 600, padding: '4px 12px', opacity: t.id === 'team' ? 0.4 : 1 }}>{busy === t.id ? '…' : suspended ? 'Reaktivieren' : 'Sperren'}</button>
                </div>
                {open && <TenantMembers tenantId={t.id} />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ComplianceCard — DSGVO retention review (admin only): candidates due for
   review, with a per-row Anonymize action. Never auto-deletes. */
function ComplianceCard() {
  const [isAdmin, setIsAdmin] = React.useState(null); // null = unknown
  const [items, setItems] = React.useState(null); // null = loading
  const [busy, setBusy] = React.useState('');
  const [policy, setPolicy] = React.useState(null);
  const [sweeping, setSweeping] = React.useState(false);
  const [confirm, setConfirm] = React.useState(null); // designed confirm for irreversible anonymise (#200)

  const reload = React.useCallback(() => {
    return window.RecruitApi.retentionReport()
      .then((r) => setItems(r))
      .catch(() => setItems([]));
  }, []);

  React.useEffect(() => {
    let alive = true;
    // The retention report is admin-only; resolve the role first and only fetch
    // it for admins, so non-admins never fire a call that would 403.
    window.RecruitApi.authMe()
      .then((me) => {
        const admin = !!(me && me.roles && me.roles.includes('admin'));
        if (!alive) return;
        setIsAdmin(admin);
        if (!admin) { setItems([]); return; }
        window.RecruitApi.getRetentionPolicy().then((p) => { if (alive) setPolicy(p); }).catch(() => {});
        return window.RecruitApi.retentionReport()
          .then((r) => { if (alive) setItems(r); })
          .catch(() => { if (alive) setItems([]); });
      })
      .catch(() => { if (alive) { setIsAdmin(false); setItems([]); } });
    return () => { alive = false; };
  }, []);

  // Anonymisation is irreversible (DSGVO), so it keeps a deliberate confirm —
  // but a designed one (ConfirmDialog), not the browser's window.confirm (#200).
  const runAnonymize = async (item) => {
    setBusy(item.talentId);
    try {
      await window.RecruitApi.anonymizeTalent(item.talentId);
      setItems((xs) => xs.filter((x) => x.talentId !== item.talentId));
    } catch {
      // eslint-disable-next-line no-alert
      window.alert(`${item.name} konnte nicht anonymisiert werden. Bitte versuche es erneut.`);
    }
    setBusy('');
  };
  const anonymize = (item) => {
    if (busy) return;
    setConfirm({
      title: `${item.name} anonymisieren?`,
      message: 'Das löscht personenbezogene Daten und entfernt Anhänge. Das kann nicht rückgängig gemacht werden.',
      confirmLabel: 'Anonymisieren',
      onConfirm: () => { setConfirm(null); runAnonymize(item); },
    });
  };

  const savePolicy = async (patch) => {
    const prev = policy;
    setPolicy({ ...policy, ...patch }); // optimistic
    try {
      const saved = await window.RecruitApi.updateRetentionPolicy(patch);
      setPolicy(saved);
      reload();
    } catch {
      setPolicy(prev); // roll the optimistic change back
      // eslint-disable-next-line no-alert
      window.alert('Die Aufbewahrungsrichtlinie konnte nicht gespeichert werden. Bitte versuche es erneut.');
    }
  };

  const runSweepOverdue = async () => {
    setSweeping(true);
    try {
      await window.RecruitApi.anonymizeOverdue();
      await reload();
    } catch {
      // eslint-disable-next-line no-alert
      window.alert('Die überfälligen Kandidaten konnten nicht anonymisiert werden. Bitte versuche es erneut.');
    }
    setSweeping(false);
  };
  const sweepOverdue = () => {
    if (sweeping) return;
    setConfirm({
      title: 'Alle überfälligen Kandidaten anonymisieren?',
      message: 'Jeder Kandidat, dessen Löschfrist überschritten ist, wird anonymisiert. Das kann nicht rückgängig gemacht werden.',
      confirmLabel: 'Alle anonymisieren',
      onConfirm: () => { setConfirm(null); runSweepOverdue(); },
    });
  };

  if (isAdmin === false) return null; // compliance is admin-only

  const overdueCount = (items || []).filter((i) => i.overdue).length;

  return (
    <div style={{ background: 'var(--surface-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-sm)', padding: '22px 24px' }}>
      {confirm && (
        <window.ConfirmDialog
          title={confirm.title}
          message={confirm.message}
          confirmLabel={confirm.confirmLabel}
          onConfirm={confirm.onConfirm}
          onCancel={() => setConfirm(null)}
        />
      )}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
        <div style={{ flex: 1 }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 700, color: 'var(--text-heading)', margin: 0, letterSpacing: '-0.01em' }}>Datenaufbewahrung (DSGVO)</h2>
          <div style={{ fontSize: '12.5px', color: 'var(--text-soft)', marginTop: '2px' }}>Kandidaten, die seit einer Weile keine aktive Pipeline mehr haben. Nach Ablauf der Löschfrist sind sie überfällig — anonymisiere sie bei der Prüfung, gesammelt, oder überlasse es dem automatischen Durchlauf.</div>
        </div>
        {items && <span style={{ flexShrink: 0, fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-soft)', background: 'var(--surface-sunk)', border: '1px solid var(--border)', borderRadius: 'var(--radius-pill)', padding: '4px 10px' }}>{items.length} fällig{overdueCount > 0 ? ` · ${overdueCount} überfällig` : ''}</span>}
      </div>

      {/* Löschfristen policy: review window, deletion deadline, auto-anonymize */}
      {policy && (
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '10px 18px', marginTop: '14px', padding: '12px 14px', background: 'var(--surface-sunk)', borderRadius: 'var(--radius-md)' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '12px', color: 'var(--text-muted)' }}>
            Prüfen nach
            <input type="number" min="1" max="3650" value={policy.reviewDays} onChange={(e) => setPolicy({ ...policy, reviewDays: Number(e.target.value) })} onBlur={(e) => savePolicy({ reviewDays: Number(e.target.value) })} style={{ width: '64px', padding: '4px 7px', border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-sm)', background: 'var(--surface-card)', color: 'var(--text-heading)', fontFamily: 'var(--font-mono)', fontSize: '12px' }} />
            Tagen
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '12px', color: 'var(--text-muted)' }}>
            Löschen nach
            <input type="number" min="1" max="3650" value={policy.deletionDays} onChange={(e) => setPolicy({ ...policy, deletionDays: Number(e.target.value) })} onBlur={(e) => savePolicy({ deletionDays: Number(e.target.value) })} style={{ width: '64px', padding: '4px 7px', border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-sm)', background: 'var(--surface-card)', color: 'var(--text-heading)', fontFamily: 'var(--font-mono)', fontSize: '12px' }} />
            Tagen
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '12px', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <input type="checkbox" checked={policy.autoAnonymize} onChange={(e) => savePolicy({ autoAnonymize: e.target.checked })} />
            Überfällige automatisch anonymisieren (läuft auf dem Server)
          </label>
        </div>
      )}

      {overdueCount > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginTop: '12px', padding: '10px 14px', background: 'var(--danger-soft, rgba(200,50,50,0.08))', border: '1px solid var(--danger)', borderRadius: 'var(--radius-md)' }}>
          <span style={{ fontSize: '12.5px', color: 'var(--danger)' }}>{overdueCount === 1 ? '1 Kandidat hat' : `${overdueCount} Kandidaten haben`} die Löschfrist überschritten.</span>
          <button type="button" onClick={sweepOverdue} disabled={sweeping} style={{ cursor: sweeping ? 'default' : 'pointer', border: '1px solid var(--danger)', borderRadius: 'var(--radius-pill)', background: 'var(--danger)', color: '#fff', fontFamily: 'var(--font-mono)', fontSize: '11px', fontWeight: 600, padding: '5px 14px', whiteSpace: 'nowrap' }}>{sweeping ? 'Wird anonymisiert…' : `Alle überfälligen anonymisieren`}</button>
        </div>
      )}

      {items === null ? (
        <div style={{ padding: '28px', textAlign: 'center', color: 'var(--text-soft)', fontSize: '13px' }}>Wird geladen…</div>
      ) : items.length === 0 ? (
        <div style={{ padding: '22px', textAlign: 'center', color: 'var(--text-soft)', fontSize: '13px' }}>Nichts zur Prüfung fällig.</div>
      ) : (
        <div style={{ marginTop: '12px' }}>
          {items.map((it) => (
            <div key={it.talentId} style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) auto auto', gap: '14px', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--text-heading)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{it.name}</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-soft)' }}>{it.role || '—'}</div>
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11.5px', color: it.overdue ? 'var(--danger)' : 'var(--text-muted)', whiteSpace: 'nowrap' }}>{it.inactiveDays}d inaktiv{it.overdue ? ' · überfällig' : ''}</div>
              <button type="button" onClick={() => anonymize(it)} disabled={busy === it.talentId} style={{ cursor: busy ? 'default' : 'pointer', border: '1px solid var(--danger)', borderRadius: 'var(--radius-pill)', background: 'none', color: 'var(--danger)', fontFamily: 'var(--font-mono)', fontSize: '11px', fontWeight: 600, padding: '4px 12px' }}>{busy === it.talentId ? 'Wird anonymisiert…' : 'Anonymisieren'}</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* UsageCard — the signed-in user's AI consumption: requests, tokens and a
   rough USD cost, with a per-feature breakdown. Usage is per user because API
   keys (and quota) are per user. */
const USAGE_FEATURE_LABELS = {
  suggest: 'Dokumenten-Assistenz',
  tailor: 'Bewerbungsanpassung',
  parse: 'Lebenslauf-Analyse',
  ats: 'ATS-Bewertung',
  pitch: 'Kandidaten-Pitch',
  outreach: 'Ansprache',
  coverLetter: 'Anschreiben',
  matchExplain: 'Match-Erklärung',
  interviewKit: 'Interview-Kit',
  candidatePrep: 'Kandidaten-Vorbereitung',
  translate: 'Übersetzung',
};

function formatTokens(n) {
  const v = Number(n) || 0;
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)}k`;
  return String(v);
}

function formatCost(usd) {
  const v = Number(usd) || 0;
  if (v === 0) return '$0.00';
  return v < 0.01 ? `$${v.toFixed(4)}` : `$${v.toFixed(2)}`;
}

function UsageStat({ label, value }) {
  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: '22px', fontWeight: 700, color: 'var(--text-heading)', letterSpacing: '-0.01em' }}>{value}</div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10.5px', letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--text-soft)', marginTop: '2px' }}>{label}</div>
    </div>
  );
}

function UsageCard() {
  const [usage, setUsage] = React.useState(null); // null = loading
  const [error, setError] = React.useState(false);

  React.useEffect(() => {
    let alive = true;
    window.RecruitApi.getUsage()
      .then((u) => { if (alive) setUsage(u); })
      .catch(() => { if (alive) setError(true); });
    return () => { alive = false; };
  }, []);

  return (
    <div style={{ background: 'var(--surface-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-sm)', padding: '22px 24px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
        <div style={{ flex: 1 }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 700, color: 'var(--text-heading)', margin: 0, letterSpacing: '-0.01em' }}>KI-Nutzung</h2>
          <div style={{ fontSize: '12.5px', color: 'var(--text-soft)', marginTop: '2px' }}>Was dein Konto bisher für KI ausgegeben hat. Die Kosten sind eine Schätzung anhand öffentlicher Listenpreise, keine Rechnung.</div>
        </div>
        {usage && usage.requests > 0 && (
          <a href={window.RecruitApi.usageAuditCsvUrl()} download title="Das KI-Audit-Protokoll pro Aufruf herunterladen (CSV)" style={{ flexShrink: 0, textDecoration: 'none', fontFamily: 'var(--font-mono)', fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-pill)', padding: '5px 12px' }}>Audit-Protokoll (CSV)</a>
        )}
      </div>

      {error ? (
        <div style={{ padding: '22px', textAlign: 'center', color: 'var(--text-soft)', fontSize: '13px' }}>Nutzung konnte nicht geladen werden.</div>
      ) : usage === null ? (
        <div style={{ padding: '28px', textAlign: 'center', color: 'var(--text-soft)', fontSize: '13px' }}>Wird geladen…</div>
      ) : usage.requests === 0 ? (
        <div style={{ padding: '22px', textAlign: 'center', color: 'var(--text-soft)', fontSize: '13px' }}>Noch keine KI-Nutzung. Ein Pitch, ATS-Score oder Anschreiben taucht hier auf, sobald du eines erstellst.</div>
      ) : (
        <>
          <div style={{ display: 'flex', gap: '18px', marginTop: '16px', padding: '14px 16px', background: 'var(--surface-sunk)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
            <UsageStat label="Anfragen" value={usage.requests} />
            <UsageStat label="Tokens" value={formatTokens(usage.totalTokens)} />
            <UsageStat label="Gesch. Kosten" value={formatCost(usage.costUsd)} />
          </div>

          {usage.byProvider && usage.byProvider.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '10px' }}>
              {usage.byProvider.map((p) => (
                <span key={p.provider} style={{ fontFamily: 'var(--font-mono)', fontSize: '10.5px', color: 'var(--text-soft)', background: 'var(--surface-sunk)', border: '1px solid var(--border)', borderRadius: 'var(--radius-pill)', padding: '3px 10px', whiteSpace: 'nowrap' }}>
                  {p.provider} · {formatTokens(p.inputTokens)} Eingabe / {formatTokens(p.outputTokens)} Ausgabe · {formatCost(p.costUsd)}
                </span>
              ))}
            </div>
          )}

          {usage.byFeature && usage.byFeature.length > 0 && (
            <div style={{ marginTop: '14px' }}>
              {usage.byFeature.map((f) => (
                <div key={f.feature} style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) auto auto', gap: '14px', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-heading)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{USAGE_FEATURE_LABELS[f.feature] || f.feature}</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11.5px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{f.requests}× · {formatTokens(f.totalTokens)} Tok</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11.5px', color: 'var(--text-soft)', whiteSpace: 'nowrap', minWidth: '58px', textAlign: 'right' }}>{formatCost(f.costUsd)}</div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function EmailVerificationCard({ user }) {
  const [state, setState] = React.useState('idle'); // idle | sending | sent | error
  if (!user) return null;
  const verified = !!user.verifiedAt;
  const resend = () => {
    setState('sending');
    window.RecruitApi.requestEmailVerification()
      .then(() => setState('sent'))
      .catch(() => setState('error'));
  };
  return (
    <div style={{ background: 'var(--surface-card)', border: `1px solid ${verified ? 'var(--border)' : 'var(--accent-border)'}`, borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-sm)', padding: '16px 24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
      <SV.Icon name={verified ? 'check' : 'mail'} size={16} style={{ color: verified ? 'var(--status-hired-strong)' : 'var(--accent-strong)', flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--text-heading)' }}>
          {verified ? 'E-Mail-Adresse bestätigt' : 'Bestätige deine E-Mail-Adresse'}
        </div>
        <div style={{ fontSize: '12px', color: 'var(--text-soft)', marginTop: '1px' }}>
          {verified
            ? `${user.email} ist bestätigt.`
            : state === 'sent'
              ? `Gesendet — prüfe ${user.email} und klicke auf den Link.`
              : state === 'error'
                ? 'Die E-Mail konnte nicht gesendet werden. Bitte versuche es gleich erneut.'
                : `Wir senden einen Bestätigungslink an ${user.email}. In der Zwischenzeit ist nichts gesperrt.`}
        </div>
      </div>
      {!verified && (
        <SV.Button variant="outline" size="sm" disabled={state === 'sending'} onClick={resend}>
          {state === 'sending' ? 'Wird gesendet…' : state === 'sent' ? 'Erneut senden' : 'Link senden'}
        </SV.Button>
      )}
    </div>
  );
}

/* Your display name — shown in the greeting and pinned "me" profile instead of a
   placeholder derived from the email. Persisted on the recruiter's own document
   set (server-keyed by user id). */
function ProfileCard({ user }) {
  const [name, setName] = React.useState('');
  const [loaded, setLoaded] = React.useState(false);
  const [state, setState] = React.useState('idle'); // idle | saving | saved | error
  React.useEffect(() => {
    let alive = true;
    if (!user) return undefined;
    window.RecruitApi.getMyProfileName(user.id)
      .then((n) => { if (alive) { setName(n); setLoaded(true); } })
      .catch(() => { if (alive) setLoaded(true); });
    return () => { alive = false; };
  }, [user && user.id]);
  if (!user) return null;
  const save = () => {
    setState('saving');
    window.RecruitApi.setMyProfileName(user.id, name.trim())
      .then(() => setState('saved'))
      .catch(() => setState('error'));
  };
  const label = { saving: 'Wird gespeichert…', saved: 'Gespeichert — sichtbar beim nächsten Laden', error: 'Konnte nicht gespeichert werden' };
  return (
    <div style={{ background: 'var(--surface-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-sm)', padding: '22px 24px' }}>
      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 700, color: 'var(--text-heading)', margin: 0, letterSpacing: '-0.01em' }}>Dein Name</h2>
      <div style={{ fontSize: '12.5px', color: 'var(--text-soft)', marginTop: '2px', marginBottom: '14px' }}>Wird in der Begrüßung und deinem angepinnten Profil angezeigt — leg ihn fest, damit die App dich mit Namen begrüßt, nicht mit deiner E-Mail.</div>
      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
        <input
          value={name}
          onChange={(e) => { setName(e.target.value); setState('idle'); }}
          placeholder={loaded ? 'z. B. Nora Kessler' : 'Wird geladen…'}
          aria-label="Dein Name"
          style={{ flex: 1, minWidth: '200px', border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-md)', background: 'var(--surface-card)', fontFamily: 'var(--font-body)', fontSize: '13.5px', color: 'var(--text-heading)', padding: '10px 12px', outline: 'none' }}
        />
        <SV.Button size="sm" disabled={!loaded || state === 'saving' || !name.trim()} onClick={save}>Speichern</SV.Button>
        {state !== 'idle' && <span role="status" style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: state === 'error' ? 'var(--danger)' : 'var(--text-soft)' }}>{label[state]}</span>}
      </div>
    </div>
  );
}

/* Small inline appearance glyphs — the shared Icon set has no sun/moon/monitor,
   and these live only here + the rail toggle, so they don't warrant a DS icon. */
function AppearanceGlyph({ name, size = 15 }) {
  const common = {
    width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor',
    strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true,
    style: { display: 'block', flexShrink: 0 },
  };
  if (name === 'light')
    return React.createElement('svg', common,
      React.createElement('circle', { cx: 12, cy: 12, r: 4 }),
      React.createElement('path', { d: 'M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4' }));
  if (name === 'dark')
    return React.createElement('svg', common,
      React.createElement('path', { d: 'M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z' }));
  return React.createElement('svg', common, // system / monitor
    React.createElement('rect', { x: 3, y: 4, width: 18, height: 13, rx: 2 }),
    React.createElement('path', { d: 'M8 21h8M12 17v4' }));
}

/* Appearance — light / dark / system, persisted (#196). The ink nav rail stays
   dark in both themes (brand anchor), so only the working canvas changes. */
function AppearanceCard() {
  const useThemeHook = window.useTheme || (() => ['dark', () => {}]);
  const [mode] = useThemeHook();
  const t = window.myJobTheme;
  const choice = t ? t.storedChoice() : null; // null → following the system
  const active = choice || 'system';
  const pick = (key) => {
    if (!t) return;
    if (key === 'system') t.useSystem();
    else t.setMode(key);
  };
  const options = [
    ['light', 'Hell'],
    ['dark', 'Dunkel'],
    ['system', 'System'],
  ];
  const modeLabel = mode === 'light' ? 'Hell „Vivid"' : mode === 'dark' ? 'Dunkel „Klassik"' : mode;
  return (
    <div style={{ background: 'var(--surface-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-sm)', padding: '22px 24px' }}>
      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 700, color: 'var(--text-heading)', margin: 0, letterSpacing: '-0.01em' }}>Darstellung</h2>
      <div style={{ fontSize: '12.5px', color: 'var(--text-soft)', marginTop: '2px' }}>
        Wähle, wie myJob aussieht. Standardmäßig folgt es deiner Systemeinstellung. Hell ist „Vivid“ (Royal-Akzent), Dunkel ist „Klassik“ (Live-Orange).
      </div>
      <div role="group" aria-label="Darstellung" style={{ display: 'inline-flex', gap: '4px', marginTop: '14px', padding: '4px', background: 'var(--surface-sunk)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
        {options.map(([key, label]) => {
          const on = active === key;
          return (
            <button
              key={key}
              type="button"
              aria-pressed={on}
              onClick={() => pick(key)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', cursor: 'pointer', appearance: 'none', fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: on ? 600 : 500, padding: '7px 14px', borderRadius: 'var(--radius-sm)', border: `1px solid ${on ? 'var(--accent-border)' : 'transparent'}`, background: on ? 'var(--accent-soft)' : 'transparent', color: on ? 'var(--accent-strong)' : 'var(--text-muted)' }}
            >
              <AppearanceGlyph name={key} /> {label}
            </button>
          );
        })}
      </div>
      <div style={{ marginTop: '10px', fontSize: '11.5px', color: 'var(--text-soft)' }}>
        {choice ? `${modeLabel} aktiv — deine Auswahl ist für diesen Browser gespeichert.` : `Folgt deinem System (${modeLabel}).`}
      </div>
    </div>
  );
}

function SettingsView({ user, onLogout }) {
  const [settings, setSettings] = React.useState(null); // { current, providers }
  const [keys, setKeys] = React.useState({});
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    let alive = true;
    window.RecruitApi.getLlmSettings()
      .then((s) => { if (alive) setSettings(s); })
      .catch(() => { if (alive) setSettings({ current: '', providers: [] }); });
    return () => { alive = false; };
  }, []);

  // Which providers have a key stored on the server (booleans, never the keys).
  React.useEffect(() => {
    let alive = true;
    window.RecruitApi.getApiKeyStatus()
      .then((status) => { if (alive) setKeys(status); })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  const activate = (id) => {
    if (busy) return;
    setBusy(true);
    window.RecruitApi.setLlmProvider(id)
      .then(setSettings)
      .catch(() => {})
      .finally(() => setBusy(false));
  };
  const saveKey = (id, value) => {
    window.RecruitApi.setApiKey(id, value)
      .then(() => setKeys((k) => ({ ...k, [id]: true })))
      .catch(() => {});
  };
  const removeKey = (id) => {
    window.RecruitApi.removeApiKey(id)
      .then(() => setKeys((k) => ({ ...k, [id]: false })))
      .catch(() => {});
  };

  return (
    <div style={{ maxWidth: '780px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
      <ProfileCard user={user} />
      <EmailVerificationCard user={user} />
      <AppearanceCard />
      {onLogout && (
        <div style={{ background: 'var(--surface-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-sm)', padding: '18px 24px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ flex: 1 }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '16px', fontWeight: 700, color: 'var(--text-heading)', margin: 0 }}>Sitzung</h2>
            <div style={{ fontSize: '12.5px', color: 'var(--text-soft)', marginTop: '2px' }}>Von diesem Gerät abmelden.</div>
          </div>
          <SV.Button variant="outline" size="sm" iconLeft={<SV.Icon name="logout" size={15} />} onClick={onLogout}>Abmelden</SV.Button>
        </div>
      )}
      <div style={{ background: 'var(--surface-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-sm)', padding: '22px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
          <div style={{ flex: 1 }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 700, color: 'var(--text-heading)', margin: 0, letterSpacing: '-0.01em' }}>KI-Modelle & API-Schlüssel</h2>
            <div style={{ fontSize: '12.5px', color: 'var(--text-soft)', marginTop: '2px' }}>Wähle das aktive Modell und hinterlege einen Provider-Schlüssel für KI-Anschreiben und CV-Anpassung.</div>
          </div>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', flexShrink: 0, fontFamily: 'var(--font-mono)', fontSize: '10.5px', color: 'var(--text-soft)', background: 'var(--surface-sunk)', border: '1px solid var(--border)', borderRadius: 'var(--radius-pill)', padding: '4px 10px' }}><SV.Icon name="check" size={12} /> Sicher gespeichert</span>
        </div>

        {!settings ? (
          <div style={{ padding: '34px', textAlign: 'center', color: 'var(--text-soft)', fontSize: '13px' }}>Wird geladen…</div>
        ) : settings.providers.length === 0 ? (
          <div style={{ padding: '28px', textAlign: 'center', color: 'var(--text-soft)', fontSize: '13px' }}>Keine Anbieter verfügbar.</div>
        ) : (
          <div style={{ marginTop: '10px' }}>
            {settings.providers.map((p) => (
              <ProviderRow key={p.id} p={p} active={settings.current === p.id} onActivate={() => activate(p.id)} saved={keys[p.id]} onSave={(v) => saveKey(p.id, v)} onRemove={() => removeKey(p.id)} />
            ))}
          </div>
        )}

        <div style={{ display: 'flex', gap: '10px', marginTop: '16px', padding: '12px 14px', background: 'var(--surface-subtle)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', fontSize: '12.5px', color: 'var(--text-muted)', lineHeight: 1.6 }}>
          <SV.Icon name="check" size={16} style={{ flexShrink: 0, color: 'var(--text-soft)', marginTop: '2px' }} />
          <span>Schlüssel bleiben in diesem Browser und werden nur beim Generieren über einen verschlüsselten Kanal übertragen. Das aktive Modell wird mit deinem Konto gespeichert — es übersteht Neustarts und wird nicht mit Teammitgliedern geteilt. Entferne einen Schlüssel jederzeit, um den Zugriff zu widerrufen.</span>
        </div>
      </div>

      <UsageCard />
      <TeamCard />
      <InvitesCard />
      <ComplianceCard />
      <SuperAdminCard />
      <DataPrivacyCard />
    </div>
  );
}

Object.assign(window, { SettingsView });
