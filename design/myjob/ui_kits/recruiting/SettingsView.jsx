/* SettingsView — AI models & API keys. The active model is wired to the live
   /settings/llm endpoint; per-provider API keys are stored encrypted on the
   server (PUT/DELETE /settings/keys/:provider) — never in the browser. English-only. */
const SV = window.MyJobDesignSystem_f3658e;

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
        <span style={{ width: '36px', height: '36px', flexShrink: 0, borderRadius: 'var(--radius-md)', display: 'grid', placeItems: 'center', background: 'var(--ink-900)', color: '#fff', fontFamily: 'var(--font-display)', fontWeight: 700 }}>{p.label.charAt(0).toUpperCase()}</span>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-heading)' }}>
            {p.label}
            {connected && <span style={{ marginLeft: '8px', fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--status-hired-strong)', background: 'var(--status-hired-soft)', border: '1px solid var(--status-hired-border)', borderRadius: 'var(--radius-pill)', padding: '1px 8px' }}>Connected</span>}
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11.5px', color: 'var(--text-soft)' }}>{p.id}</div>
        </div>
      </div>

      {saved ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-muted)' }}>{'•'.repeat(18)}</span>
          <span style={{ fontSize: '11px', color: 'var(--text-soft)' }}>Stored securely on the server</span>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: '8px', minWidth: 0 }}>
          <input type={reveal ? 'text' : 'password'} value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={`${p.label} API key`} autoComplete="off" spellCheck="false" aria-label={`${p.label} API key`} style={{ flex: 1, minWidth: 0, border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-md)', background: 'var(--surface-card)', fontFamily: 'var(--font-mono)', fontSize: '12.5px', color: 'var(--text-heading)', padding: '9px 11px', outline: 'none' }} />
          <button type="button" onClick={() => setReveal((r) => !r)} aria-label={reveal ? 'Hide key' : 'Show key'} style={{ cursor: 'pointer', border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-md)', background: 'var(--surface-card)', color: 'var(--text-muted)', padding: '0 11px' }}><SV.Icon name="eye" size={15} /></button>
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', justifyContent: isMobile ? 'space-between' : 'flex-end' }}>
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: active ? 'var(--text-heading)' : 'var(--text-soft)', cursor: 'pointer', whiteSpace: 'nowrap' }}>
          <input type="radio" name="active-provider" checked={active} onChange={onActivate} /> Active
        </label>
        {saved ? (
          <button type="button" onClick={onRemove} style={{ cursor: 'pointer', background: 'none', border: 'none', color: 'var(--danger)', fontWeight: 600, fontSize: '12.5px' }}>Remove</button>
        ) : (
          <SV.Button size="sm" disabled={draft.trim().length === 0} onClick={() => { onSave(draft.trim()); setDraft(''); setReveal(false); }}>Save key</SV.Button>
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
      .catch(() => setError('Could not export your data. Please try again.'))
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
        setError('Could not delete your account. Please try again.');
        setBusy('');
        setConfirm(false);
      });
  };

  return (
    <div style={{ background: 'var(--surface-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-sm)', padding: '22px 24px' }}>
      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 700, color: 'var(--text-heading)', margin: 0, letterSpacing: '-0.01em' }}>Data &amp; privacy</h2>
      <div style={{ fontSize: '12.5px', color: 'var(--text-soft)', marginTop: '2px' }}>Your GDPR rights: take a copy of everything you store here, or erase your account for good.</div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', padding: '16px 0', borderBottom: '1px solid var(--border)', marginTop: '8px' }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-heading)' }}>Export my data</div>
          <div style={{ fontSize: '12px', color: 'var(--text-soft)', marginTop: '1px' }}>Download your account, mandates, talents and placements as JSON.</div>
        </div>
        <SV.Button size="sm" variant="outline" disabled={busy !== ''} onClick={exportData}>
          {busy === 'export' ? 'Preparing…' : 'Export'}
        </SV.Button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', padding: '16px 0' }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-heading)' }}>Delete my account</div>
          <div style={{ fontSize: '12px', color: 'var(--text-soft)', marginTop: '1px' }}>Permanently erases your account and all data you own. This cannot be undone.</div>
        </div>
        {confirm ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
            <button type="button" onClick={() => setConfirm(false)} disabled={busy !== ''} style={{ cursor: 'pointer', background: 'none', border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-md)', color: 'var(--text-muted)', fontSize: '12.5px', padding: '7px 12px' }}>Cancel</button>
            <button type="button" onClick={deleteAccount} disabled={busy !== ''} style={{ cursor: 'pointer', background: 'var(--danger)', border: '1px solid var(--danger)', borderRadius: 'var(--radius-md)', color: '#fff', fontWeight: 600, fontSize: '12.5px', padding: '7px 12px' }}>{busy === 'delete' ? 'Deleting…' : 'Confirm delete'}</button>
          </div>
        ) : (
          <button type="button" onClick={() => setConfirm(true)} style={{ cursor: 'pointer', background: 'none', border: '1px solid var(--status-rejected-border)', borderRadius: 'var(--radius-md)', color: 'var(--danger)', fontWeight: 600, fontSize: '12.5px', padding: '7px 12px', flexShrink: 0 }}>Delete account</button>
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
      setNote('Could not update roles — the team must keep at least one admin.');
      load();
    }
  };

  return (
    <div style={{ background: 'var(--surface-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-sm)', padding: '22px 24px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
        <div style={{ flex: 1 }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 700, color: 'var(--text-heading)', margin: 0, letterSpacing: '-0.01em' }}>Team & roles</h2>
          <div style={{ fontSize: '12.5px', color: 'var(--text-soft)', marginTop: '2px' }}>Everyone on this instance shares one workspace. {isAdmin ? 'As an admin you can change roles.' : 'Only admins can change roles.'}</div>
        </div>
        {me && <span style={{ flexShrink: 0, fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-soft)' }}>You: {(me.roles || []).join(', ')}</span>}
      </div>

      {isAdmin && members && members.length > 0 ? (
        <div style={{ marginTop: '14px' }}>
          {members.map((m) => (
            <div key={m.id} style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) auto', gap: '14px', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--text-heading)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.email}{me && m.id === me.id && <span style={{ color: 'var(--text-soft)', fontWeight: 400 }}> (you)</span>}</div>
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
          {!isAdmin && <div style={{ fontSize: '12.5px', color: 'var(--text-soft)' }}>Contact an admin to change team roles.</div>}
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
      setError((err && err.message) || 'Could not send the invitation.');
    }
    setBusy(false);
  };

  if (isAdmin === false) return null; // inviting is admin-only

  const fieldStyle = { flex: 1, minWidth: 0, border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-md)', background: 'var(--surface-card)', fontSize: '13px', color: 'var(--text-heading)', padding: '9px 11px', outline: 'none' };

  return (
    <div style={{ background: 'var(--surface-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-sm)', padding: '22px 24px' }}>
      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 700, color: 'var(--text-heading)', margin: 0, letterSpacing: '-0.01em' }}>Invite a colleague</h2>
      <div style={{ fontSize: '12.5px', color: 'var(--text-soft)', marginTop: '2px' }}>Send an email invite to join this workspace. They set a password and land in your team with the roles you pick.</div>

      <form onSubmit={submit} style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '10px', marginTop: '14px' }}>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="colleague@example.com" aria-label="Invite email" autoComplete="off" style={fieldStyle} />
        {TEAM_ROLES.map((role) => (
          <label key={role} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', color: roles.includes(role) ? 'var(--text-heading)' : 'var(--text-soft)', cursor: 'pointer' }}>
            <input type="checkbox" checked={roles.includes(role)} onChange={() => toggleRole(role)} /> {role}
          </label>
        ))}
        <SV.Button size="sm" disabled={busy || email.trim().length === 0} onClick={submit}>{busy ? 'Sending…' : 'Send invite'}</SV.Button>
      </form>

      {error && <div role="alert" style={{ fontSize: '12.5px', color: 'var(--danger)', marginTop: '10px' }}>{error}</div>}
      {lastLink && (
        <div style={{ marginTop: '12px', padding: '10px 12px', background: 'var(--surface-sunk)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
          <div style={{ fontSize: '11.5px', color: 'var(--text-soft)', marginBottom: '4px' }}>Invitation sent. If email isn’t configured, share this link:</div>
          <input readOnly value={lastLink} aria-label="Invite link" onFocus={(e) => e.target.select()} style={{ width: '100%', border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-sm)', background: 'var(--surface-card)', fontFamily: 'var(--font-mono)', fontSize: '11.5px', color: 'var(--text-heading)', padding: '6px 8px' }} />
        </div>
      )}

      {invites && invites.length > 0 && (
        <div style={{ marginTop: '14px' }}>
          {invites.map((i) => (
            <div key={i.email} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
              <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-heading)', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{i.email}</span>
              <span style={{ marginLeft: 'auto', display: 'inline-flex', gap: '5px' }}>{(i.roles || []).map((r) => <RoleBadge key={r} role={r} />)}</span>
              <span style={{ flexShrink: 0, fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--text-soft)' }}>Pending</span>
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
      setNote('Could not update roles — the tenant must keep at least one admin.');
      load();
    }
  };

  if (members === null) return <div style={{ padding: '8px 0', fontSize: '12px', color: 'var(--text-soft)' }}>Loading members…</div>;
  return (
    <div style={{ padding: '4px 0 8px 12px' }}>
      {members.map((m) => (
        <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '6px 0' }}>
          <span style={{ fontSize: '12.5px', color: 'var(--text-heading)', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.email}</span>
          <span style={{ marginLeft: 'auto', display: 'inline-flex', gap: '12px' }}>
            {TEAM_ROLES.map((role) => (
              <label key={role} style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '12px', color: m.roles.includes(role) ? 'var(--text-heading)' : 'var(--text-soft)', cursor: 'pointer' }}>
                <input type="checkbox" aria-label={`${role} role for ${m.email}`} checked={m.roles.includes(role)} onChange={() => toggleRole(m, role)} /> {role}
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
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 700, color: 'var(--text-heading)', margin: 0, letterSpacing: '-0.01em' }}>Platform — all workspaces</h2>
          <div style={{ fontSize: '12.5px', color: 'var(--text-soft)', marginTop: '2px' }}>Instance super-admin. Every tenant on this deployment; suspend one to lock its members out immediately, or change a member's roles.</div>
        </div>
        <span style={{ flexShrink: 0, fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--accent-strong)', background: 'var(--accent-soft)', border: '1px solid var(--accent-border, var(--border))', borderRadius: 'var(--radius-pill)', padding: '3px 9px' }}>Super-admin</span>
      </div>

      {tenants === null ? (
        <div style={{ padding: '22px', textAlign: 'center', color: 'var(--text-soft)', fontSize: '13px' }}>Loading…</div>
      ) : tenants.length === 0 ? (
        <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-soft)', fontSize: '13px' }}>No tenants yet.</div>
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
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-soft)' }}>{t.memberCount} member{t.memberCount === 1 ? '' : 's'}</span>
                  <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.04em', textTransform: 'uppercase', color: suspended ? 'var(--danger)' : 'var(--status-hired-strong)', background: suspended ? 'var(--danger-soft, rgba(200,50,50,0.08))' : 'var(--status-hired-soft)', border: `1px solid ${suspended ? 'var(--danger)' : 'var(--status-hired-border)'}`, borderRadius: 'var(--radius-pill)', padding: '1px 8px' }}>{t.status}</span>
                  <button type="button" disabled={busy === t.id || t.id === 'team'} title={t.id === 'team' ? 'The default team cannot be suspended' : ''} onClick={() => setStatus(t, suspended ? 'active' : 'suspended')} style={{ cursor: busy === t.id || t.id === 'team' ? 'default' : 'pointer', border: `1px solid ${suspended ? 'var(--status-hired-border)' : 'var(--status-rejected-border)'}`, borderRadius: 'var(--radius-pill)', background: 'none', color: suspended ? 'var(--status-hired-strong)' : 'var(--danger)', fontFamily: 'var(--font-mono)', fontSize: '11px', fontWeight: 600, padding: '4px 12px', opacity: t.id === 'team' ? 0.4 : 1 }}>{busy === t.id ? '…' : suspended ? 'Reactivate' : 'Suspend'}</button>
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

  const anonymize = async (item) => {
    if (busy) return;
    // eslint-disable-next-line no-alert
    if (!window.confirm(`Anonymize ${item.name}? This clears personal data and removes attachments. This cannot be undone.`)) return;
    setBusy(item.talentId);
    try {
      await window.RecruitApi.anonymizeTalent(item.talentId);
      setItems((xs) => xs.filter((x) => x.talentId !== item.talentId));
    } catch {
      // eslint-disable-next-line no-alert
      window.alert(`Could not anonymize ${item.name}. Please try again.`);
    }
    setBusy('');
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
      window.alert('Could not save the retention policy. Please try again.');
    }
  };

  const sweepOverdue = async () => {
    if (sweeping) return;
    // eslint-disable-next-line no-alert
    if (!window.confirm('Anonymize every candidate past the deletion deadline? This cannot be undone.')) return;
    setSweeping(true);
    try {
      await window.RecruitApi.anonymizeOverdue();
      await reload();
    } catch {
      // eslint-disable-next-line no-alert
      window.alert('Could not anonymize the overdue candidates. Please try again.');
    }
    setSweeping(false);
  };

  if (isAdmin === false) return null; // compliance is admin-only

  const overdueCount = (items || []).filter((i) => i.overdue).length;

  return (
    <div style={{ background: 'var(--surface-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-sm)', padding: '22px 24px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
        <div style={{ flex: 1 }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 700, color: 'var(--text-heading)', margin: 0, letterSpacing: '-0.01em' }}>Data retention (DSGVO)</h2>
          <div style={{ fontSize: '12.5px', color: 'var(--text-soft)', marginTop: '2px' }}>Candidates with no active pipeline for a while. Past the deletion deadline they are overdue — anonymize on review, in bulk, or let the automatic sweep clear them.</div>
        </div>
        {items && <span style={{ flexShrink: 0, fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-soft)', background: 'var(--surface-sunk)', border: '1px solid var(--border)', borderRadius: 'var(--radius-pill)', padding: '4px 10px' }}>{items.length} due{overdueCount > 0 ? ` · ${overdueCount} overdue` : ''}</span>}
      </div>

      {/* Löschfristen policy: review window, deletion deadline, auto-anonymize */}
      {policy && (
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '10px 18px', marginTop: '14px', padding: '12px 14px', background: 'var(--surface-sunk)', borderRadius: 'var(--radius-md)' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '12px', color: 'var(--text-muted)' }}>
            Review after
            <input type="number" min="1" max="3650" value={policy.reviewDays} onChange={(e) => setPolicy({ ...policy, reviewDays: Number(e.target.value) })} onBlur={(e) => savePolicy({ reviewDays: Number(e.target.value) })} style={{ width: '64px', padding: '4px 7px', border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-sm)', background: 'var(--surface-card)', color: 'var(--text-heading)', fontFamily: 'var(--font-mono)', fontSize: '12px' }} />
            days
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '12px', color: 'var(--text-muted)' }}>
            Delete after
            <input type="number" min="1" max="3650" value={policy.deletionDays} onChange={(e) => setPolicy({ ...policy, deletionDays: Number(e.target.value) })} onBlur={(e) => savePolicy({ deletionDays: Number(e.target.value) })} style={{ width: '64px', padding: '4px 7px', border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-sm)', background: 'var(--surface-card)', color: 'var(--text-heading)', fontFamily: 'var(--font-mono)', fontSize: '12px' }} />
            days
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '12px', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <input type="checkbox" checked={policy.autoAnonymize} onChange={(e) => savePolicy({ autoAnonymize: e.target.checked })} />
            Auto-anonymize overdue (runs on the server)
          </label>
        </div>
      )}

      {overdueCount > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginTop: '12px', padding: '10px 14px', background: 'var(--danger-soft, rgba(200,50,50,0.08))', border: '1px solid var(--danger)', borderRadius: 'var(--radius-md)' }}>
          <span style={{ fontSize: '12.5px', color: 'var(--danger)' }}>{overdueCount} candidate{overdueCount === 1 ? ' is' : 's are'} past the deletion deadline.</span>
          <button type="button" onClick={sweepOverdue} disabled={sweeping} style={{ cursor: sweeping ? 'default' : 'pointer', border: '1px solid var(--danger)', borderRadius: 'var(--radius-pill)', background: 'var(--danger)', color: '#fff', fontFamily: 'var(--font-mono)', fontSize: '11px', fontWeight: 600, padding: '5px 14px', whiteSpace: 'nowrap' }}>{sweeping ? 'Anonymizing…' : `Anonymize all overdue`}</button>
        </div>
      )}

      {items === null ? (
        <div style={{ padding: '28px', textAlign: 'center', color: 'var(--text-soft)', fontSize: '13px' }}>Loading…</div>
      ) : items.length === 0 ? (
        <div style={{ padding: '22px', textAlign: 'center', color: 'var(--text-soft)', fontSize: '13px' }}>Nothing due for review. 🎉</div>
      ) : (
        <div style={{ marginTop: '12px' }}>
          {items.map((it) => (
            <div key={it.talentId} style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) auto auto', gap: '14px', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--text-heading)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{it.name}</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-soft)' }}>{it.role || '—'}</div>
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11.5px', color: it.overdue ? 'var(--danger)' : 'var(--text-muted)', whiteSpace: 'nowrap' }}>{it.inactiveDays}d inactive{it.overdue ? ' · overdue' : ''}</div>
              <button type="button" onClick={() => anonymize(it)} disabled={busy === it.talentId} style={{ cursor: busy ? 'default' : 'pointer', border: '1px solid var(--danger)', borderRadius: 'var(--radius-pill)', background: 'none', color: 'var(--danger)', fontFamily: 'var(--font-mono)', fontSize: '11px', fontWeight: 600, padding: '4px 12px' }}>{busy === it.talentId ? 'Anonymizing…' : 'Anonymize'}</button>
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
  suggest: 'Document assist',
  tailor: 'Application tailoring',
  parse: 'CV parsing',
  ats: 'ATS scoring',
  pitch: 'Candidate pitch',
  outreach: 'Outreach',
  coverLetter: 'Cover letter',
  matchExplain: 'Match explanation',
  interviewKit: 'Interview kit',
  candidatePrep: 'Candidate prep',
  translate: 'Translation',
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
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 700, color: 'var(--text-heading)', margin: 0, letterSpacing: '-0.01em' }}>AI usage</h2>
          <div style={{ fontSize: '12.5px', color: 'var(--text-soft)', marginTop: '2px' }}>What your account has spent on AI so far. The cost is an estimate from public list prices, not a bill.</div>
        </div>
        {usage && usage.requests > 0 && (
          <a href={window.RecruitApi.usageAuditCsvUrl()} download title="Download the per-call AI audit trail (CSV)" style={{ flexShrink: 0, textDecoration: 'none', fontFamily: 'var(--font-mono)', fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-pill)', padding: '5px 12px' }}>Audit trail (CSV)</a>
        )}
      </div>

      {error ? (
        <div style={{ padding: '22px', textAlign: 'center', color: 'var(--text-soft)', fontSize: '13px' }}>Could not load usage.</div>
      ) : usage === null ? (
        <div style={{ padding: '28px', textAlign: 'center', color: 'var(--text-soft)', fontSize: '13px' }}>Loading…</div>
      ) : usage.requests === 0 ? (
        <div style={{ padding: '22px', textAlign: 'center', color: 'var(--text-soft)', fontSize: '13px' }}>No AI usage yet. Generating a pitch, ATS score or cover letter will show up here.</div>
      ) : (
        <>
          <div style={{ display: 'flex', gap: '18px', marginTop: '16px', padding: '14px 16px', background: 'var(--surface-sunk)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
            <UsageStat label="Requests" value={usage.requests} />
            <UsageStat label="Tokens" value={formatTokens(usage.totalTokens)} />
            <UsageStat label="Est. cost" value={formatCost(usage.costUsd)} />
          </div>

          {usage.byProvider && usage.byProvider.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '10px' }}>
              {usage.byProvider.map((p) => (
                <span key={p.provider} style={{ fontFamily: 'var(--font-mono)', fontSize: '10.5px', color: 'var(--text-soft)', background: 'var(--surface-sunk)', border: '1px solid var(--border)', borderRadius: 'var(--radius-pill)', padding: '3px 10px', whiteSpace: 'nowrap' }}>
                  {p.provider} · {formatTokens(p.inputTokens)} in / {formatTokens(p.outputTokens)} out · {formatCost(p.costUsd)}
                </span>
              ))}
            </div>
          )}

          {usage.byFeature && usage.byFeature.length > 0 && (
            <div style={{ marginTop: '14px' }}>
              {usage.byFeature.map((f) => (
                <div key={f.feature} style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) auto auto', gap: '14px', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-heading)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{USAGE_FEATURE_LABELS[f.feature] || f.feature}</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11.5px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{f.requests}× · {formatTokens(f.totalTokens)} tok</div>
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
          {verified ? 'Email address confirmed' : 'Confirm your email address'}
        </div>
        <div style={{ fontSize: '12px', color: 'var(--text-soft)', marginTop: '1px' }}>
          {verified
            ? `${user.email} is verified.`
            : state === 'sent'
              ? `Sent — check ${user.email} and click the link.`
              : state === 'error'
                ? 'Could not send the email. Try again in a moment.'
                : `We'll send a confirmation link to ${user.email}. Nothing is locked meanwhile.`}
        </div>
      </div>
      {!verified && (
        <SV.Button variant="outline" size="sm" disabled={state === 'sending'} onClick={resend}>
          {state === 'sending' ? 'Sending…' : state === 'sent' ? 'Send again' : 'Send link'}
        </SV.Button>
      )}
    </div>
  );
}

function SettingsView({ user }) {
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
      <EmailVerificationCard user={user} />
      <div style={{ background: 'var(--surface-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-sm)', padding: '22px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
          <div style={{ flex: 1 }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 700, color: 'var(--text-heading)', margin: 0, letterSpacing: '-0.01em' }}>AI models & API keys</h2>
            <div style={{ fontSize: '12.5px', color: 'var(--text-soft)', marginTop: '2px' }}>Pick the active model and connect a provider key for AI cover letters and CV tailoring.</div>
          </div>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', flexShrink: 0, fontFamily: 'var(--font-mono)', fontSize: '10.5px', color: 'var(--text-soft)', background: 'var(--surface-sunk)', border: '1px solid var(--border)', borderRadius: 'var(--radius-pill)', padding: '4px 10px' }}><SV.Icon name="check" size={12} /> Stored securely</span>
        </div>

        {!settings ? (
          <div style={{ padding: '34px', textAlign: 'center', color: 'var(--text-soft)', fontSize: '13px' }}>Loading…</div>
        ) : settings.providers.length === 0 ? (
          <div style={{ padding: '28px', textAlign: 'center', color: 'var(--text-soft)', fontSize: '13px' }}>No providers available.</div>
        ) : (
          <div style={{ marginTop: '10px' }}>
            {settings.providers.map((p) => (
              <ProviderRow key={p.id} p={p} active={settings.current === p.id} onActivate={() => activate(p.id)} saved={keys[p.id]} onSave={(v) => saveKey(p.id, v)} onRemove={() => removeKey(p.id)} />
            ))}
          </div>
        )}

        <div style={{ display: 'flex', gap: '10px', marginTop: '16px', padding: '12px 14px', background: 'var(--surface-subtle)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', fontSize: '12.5px', color: 'var(--text-muted)', lineHeight: 1.6 }}>
          <SV.Icon name="check" size={16} style={{ flexShrink: 0, color: 'var(--text-soft)', marginTop: '2px' }} />
          <span>Keys are kept in this browser and sent over an encrypted channel only when generating. The active model is stored with your account — it survives restarts and is not shared with teammates. Remove a key any time to revoke access.</span>
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
