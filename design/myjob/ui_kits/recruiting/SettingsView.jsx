/* SettingsView — AI setup, workspace switch & privacy. The AI card reads the
   live /settings/llm status (one central server key, ADR-0057) — there are no
   per-user keys stored in the browser or on the server. German-first. */
const SV = window.MyJobDesignSystem_5611b7;

/* The central AI setup (ADR-0057): one server key, no per-user keys. */
function AiSetupCard() {
  const [state, setState] = React.useState(null); // null = loading; error = fetch failed
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState('');
  const load = React.useCallback(() => {
    window.RecruitApi.getLlmSettings()
      .then((s) => {
        const providers = Array.isArray(s && s.providers) ? s.providers : [];
        setState({
          configured: !!(s && s.configured),
          providers,
          current: (s && s.current) || null,
        });
        try {
          window.dispatchEvent(new CustomEvent('myjob:aistatuschange'));
        } catch {
          /* ignore */
        }
      })
      .catch(() => setState({ error: true, configured: false, providers: [], current: null }));
  }, []);
  React.useEffect(() => { load(); }, [load]);
  const choose = (id) => {
    setBusy(true);
    setError('');
    window.RecruitApi.updateLlmSettings({ provider: id })
      .then((s) => {
        const providers = Array.isArray(s && s.providers) ? s.providers : [];
        setState({ configured: !!(s && s.configured), providers, current: (s && s.current) || null });
        try {
          window.dispatchEvent(new CustomEvent('myjob:aistatuschange'));
        } catch {
          /* ignore */
        }
      })
      .catch(() => setError('The provider could not be switched.'))
      .finally(() => setBusy(false));
  };

  return (
    <div style={{ background: 'var(--surface-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-sm)', padding: '22px 24px' }}>
      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 700, color: 'var(--text-heading)', margin: 0, letterSpacing: '-0.01em' }}>AI connection</h2>
      <div style={{ fontSize: '12.5px', color: 'var(--text-soft)', marginTop: '2px' }}>One central key per server. Without a key every AI button shows "AI not configured" and sends no request.</div>
      {state === null ? (
        <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-soft)', fontSize: '13px' }}>Loading…</div>
      ) : state.error ? (
        <div role="alert" style={{ marginTop: '14px', padding: '12px 14px', background: 'var(--surface-sunk)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', fontSize: '12.5px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <span style={{ flex: 1 }}>The AI status could not be loaded. Whether a key is set cannot be determined right now.</span>
          <button type="button" onClick={load} style={{ cursor: 'pointer', border: '1px solid var(--border-strong)', background: 'none', color: 'var(--text-heading)', borderRadius: 'var(--radius-pill)', fontFamily: 'var(--font-mono)', fontSize: '11px', fontWeight: 600, padding: '4px 12px' }}>
            Reload
          </button>
        </div>
      ) : state.configured ? (
        <div style={{ marginTop: '14px' }}>
          <div role="status" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--status-hired-strong)' }}>
            <SV.Icon name="check" size={16} /> AI configured
            {state.current && (
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-soft)' }}>
                · {state.current}
              </span>
            )}
          </div>
          {state.providers.some((p) => p.available) && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginTop: '10px' }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-soft)' }}>Provider</span>
              {state.providers.filter((p) => p.available).map((p) => (
                <button
                  key={p.id}
                  type="button"
                  disabled={busy || state.current === p.id}
                  onClick={() => choose(p.id)}
                  style={{ cursor: busy || state.current === p.id ? 'default' : 'pointer', border: `1px solid ${state.current === p.id ? 'var(--accent)' : 'var(--border-strong)'}`, background: state.current === p.id ? 'var(--accent-soft)' : 'var(--surface-card)', color: state.current === p.id ? 'var(--accent-strong)' : 'var(--text-muted)', borderRadius: 'var(--radius-pill)', fontFamily: 'var(--font-mono)', fontSize: '11px', padding: '4px 12px' }}
                >
                  {p.label || p.id}
                </button>
              ))}
            </div>
          )}
          {error && <div role="alert" style={{ fontSize: '12.5px', color: 'var(--danger)', marginTop: '8px' }}>{error}</div>}
        </div>
      ) : (
        <div role="alert" style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginTop: '14px', padding: '12px 14px', background: 'var(--surface-sunk)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
          <SV.Icon name="zap" size={16} style={{ color: 'var(--text-soft)', flexShrink: 0, marginTop: '2px' }} />
          <div style={{ fontSize: '12.5px', color: 'var(--text-muted)', lineHeight: 1.6 }}>
            <strong style={{ color: 'var(--text-heading)' }}>AI not configured.</strong> Set <code>ANTHROPIC_API_KEY</code> (or optionally <code>GEMINI_API_KEY</code>) as a server environment variable and restart the server.
          </div>
        </div>
      )}
    </div>
  );
}

/* The per-workspace intermediary switch (ADR-0057) + AI consent (ADR-0063) —
   admin-only. */
function WorkspaceSettingsCard() {
  const [isAdmin, setIsAdmin] = React.useState(null);
  const [vermittlung, setVermittlung] = React.useState(false);
  const [aiConsent, setAiConsent] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [consentBusy, setConsentBusy] = React.useState(false);
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    let alive = true;
    window.RecruitApi.authMe()
      .then((me) => {
        const admin = !!(me && me.roles && me.roles.includes('admin'));
        if (!alive) return;
        setIsAdmin(admin);
      })
      .catch(() => { if (alive) setIsAdmin(false); });
    window.RecruitApi.getWorkspaceSettings()
      .then((s) => {
        if (!alive) return;
        setVermittlung(!!(s && s.vermittlung));
        setAiConsent(!!(s && s.aiConsent));
      })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  const toggle = () => {
    if (!isAdmin || busy) return;
    const next = !vermittlung;
    setBusy(true);
    setError('');
    window.RecruitApi.updateWorkspaceSettings({ vermittlung: next })
      .then((s) => {
        const on = !!(s && s.vermittlung);
        setVermittlung(on);
        // The shared store feeds the rail; refresh it so the nav re-renders
        // immediately (no reload needed).
        if (window.WorkspaceSettings) window.WorkspaceSettings.refresh();
      })
      .catch(() => setError('The switch could not be saved. Please try again.'))
      .finally(() => setBusy(false));
  };

  const revokeConsent = () => {
    if (!isAdmin || consentBusy) return;
    setConsentBusy(true);
    setError('');
    window.RecruitApi.updateWorkspaceSettings({ aiConsent: false })
      .then((s) => {
        setAiConsent(!!(s && s.aiConsent));
        if (window.WorkspaceSettings) window.WorkspaceSettings.refresh();
      })
      .catch(() => setError('The consent could not be revoked.'))
      .finally(() => setConsentBusy(false));
  };

  if (isAdmin === false) return null; // admin-only

  return (
    <div style={{ background: 'var(--surface-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-sm)', padding: '22px 24px' }}>
      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 700, color: 'var(--text-heading)', margin: 0, letterSpacing: '-0.01em' }}>Workspace</h2>
      <div style={{ fontSize: '12.5px', color: 'var(--text-soft)', marginTop: '2px' }}>The application service is the main path. The agency features (mandates, pipeline, placements, performance, inbox, CoRecruiter) are off by default. Turning it off deletes nothing — the data is still there unchanged after you turn it back on.</div>
      <label style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '16px', cursor: isAdmin ? 'pointer' : 'default', fontSize: '13.5px', color: 'var(--text-heading)' }}>
        <input type="checkbox" checked={vermittlung} onChange={toggle} disabled={!isAdmin || busy} aria-label="Agency" />
        Agency
      </label>

      <div style={{ marginTop: '22px', borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 600, color: 'var(--text-soft)' }}>AI consent (EU AI Act)</div>
        <div style={{ fontSize: '12.5px', color: 'var(--text-soft)', marginTop: '6px', lineHeight: 1.55 }}>
          The consent allows sending the CV and posting text to the configured AI provider. It applies to this workspace, is logged in the AI audit trail and can be revoked here at any time.
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '10px', flexWrap: 'wrap' }}>
          <span role="status" data-testid="ai-consent-state" style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', fontSize: '13px', fontWeight: 600, color: aiConsent ? 'var(--positive, #1F8A5B)' : 'var(--text-muted)' }}>
            <SV.Icon name={aiConsent ? 'check' : 'x'} size={14} />
            {aiConsent ? 'Consent granted' : 'No consent'}
          </span>
          {aiConsent && (
            <button
              type="button"
              data-testid="ai-consent-revoke"
              onClick={revokeConsent}
              disabled={consentBusy}
              style={{ cursor: consentBusy ? 'default' : 'pointer', border: '1px solid var(--danger)', background: 'none', color: 'var(--danger)', borderRadius: 'var(--radius-pill)', fontFamily: 'var(--font-mono)', fontSize: '11px', fontWeight: 600, padding: '4px 12px' }}
            >
              {consentBusy ? 'Revoking…' : 'Revoke consent'}
            </button>
          )}
        </div>
      </div>

      {error && <div role="alert" style={{ fontSize: '12.5px', color: 'var(--danger)', marginTop: '8px' }}>{error}</div>}
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
      .catch(() => setError('Your data could not be exported. Please try again.'))
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
        setError('Your account could not be deleted. Please try again.');
        setBusy('');
        setConfirm(false);
      });
  };

  return (
    <div style={{ background: 'var(--surface-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-sm)', padding: '22px 24px' }}>
      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 700, color: 'var(--text-heading)', margin: 0, letterSpacing: '-0.01em' }}>Data &amp; privacy</h2>
      <div style={{ fontSize: '12.5px', color: 'var(--text-soft)', marginTop: '2px' }}>Your GDPR rights: get a copy of everything you store here, or permanently delete your account.</div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', padding: '16px 0', borderBottom: '1px solid var(--border)', marginTop: '8px' }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-heading)' }}>Export my data</div>
          <div style={{ fontSize: '12px', color: 'var(--text-soft)', marginTop: '1px' }}>Download your account, mandates, candidates and placements as JSON.</div>
        </div>
        <SV.Button size="sm" variant="outline" disabled={busy !== ''} onClick={exportData}>
          {busy === 'export' ? 'Preparing…' : 'Export'}
        </SV.Button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', padding: '16px 0' }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-heading)' }}>Delete my account</div>
          <div style={{ fontSize: '12px', color: 'var(--text-soft)', marginTop: '1px' }}>Permanently deletes your account and all data you own. This cannot be undone.</div>
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
      setNote('Roles could not be updated — the team must keep at least one admin.');
      load();
    }
  };

  return (
    <div style={{ background: 'var(--surface-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-sm)', padding: '22px 24px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
        <div style={{ flex: 1 }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 700, color: 'var(--text-heading)', margin: 0, letterSpacing: '-0.01em' }}>Team & roles</h2>
          <div style={{ fontSize: '12.5px', color: 'var(--text-soft)', marginTop: '2px' }}>Everyone in this instance shares one workspace. {isAdmin ? 'As an admin you can change roles.' : 'Only admins can change roles.'}</div>
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
      setError((err && err.message) || 'The invitation could not be sent.');
    }
    setBusy(false);
  };

  if (isAdmin === false) return null; // inviting is admin-only

  const fieldStyle = { flex: 1, minWidth: 0, border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-md)', background: 'var(--surface-card)', fontSize: '13px', color: 'var(--text-heading)', padding: '9px 11px', outline: 'none' };

  return (
    <div style={{ background: 'var(--surface-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-sm)', padding: '22px 24px' }}>
      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 700, color: 'var(--text-heading)', margin: 0, letterSpacing: '-0.01em' }}>Invite a colleague</h2>
      <div style={{ fontSize: '12.5px', color: 'var(--text-soft)', marginTop: '2px' }}>Send an email invitation to this workspace. The person sets a password and joins your team with the roles you chose.</div>

      <form onSubmit={submit} style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '10px', marginTop: '14px' }}>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="colleague@example.com" aria-label="Email for invitation" autoComplete="off" style={fieldStyle} />
        {TEAM_ROLES.map((role) => (
          <label key={role} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', color: roles.includes(role) ? 'var(--text-heading)' : 'var(--text-soft)', cursor: 'pointer' }}>
            <input type="checkbox" checked={roles.includes(role)} onChange={() => toggleRole(role)} /> {role}
          </label>
        ))}
        <SV.Button size="sm" disabled={busy || email.trim().length === 0} onClick={submit}>{busy ? 'Sending…' : 'Send invitation'}</SV.Button>
      </form>

      {error && <div role="alert" style={{ fontSize: '12.5px', color: 'var(--danger)', marginTop: '10px' }}>{error}</div>}
      {lastLink && (
        <div style={{ marginTop: '12px', padding: '10px 12px', background: 'var(--surface-sunk)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
          <div style={{ fontSize: '11.5px', color: 'var(--text-soft)', marginBottom: '4px' }}>Invitation sent. If no email is configured, share this link:</div>
          <input readOnly value={lastLink} aria-label="Invitation link" onFocus={(e) => e.target.select()} style={{ width: '100%', border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-sm)', background: 'var(--surface-card)', fontFamily: 'var(--font-mono)', fontSize: '11.5px', color: 'var(--text-heading)', padding: '6px 8px' }} />
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
      setNote('Roles could not be updated — the workspace must keep at least one admin.');
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
                <input type="checkbox" aria-label={`Role ${role} for ${m.email}`} checked={m.roles.includes(role)} onChange={() => toggleRole(m, role)} /> {role}
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
          <div style={{ fontSize: '12.5px', color: 'var(--text-soft)', marginTop: '2px' }}>Instance super admin. Every workspace in this deployment; suspend one to lock out its members immediately, or change a member's roles.</div>
        </div>
        <span style={{ flexShrink: 0, fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--accent-strong)', background: 'var(--accent-soft)', border: '1px solid var(--accent-border, var(--border))', borderRadius: 'var(--radius-pill)', padding: '3px 9px' }}>Super admin</span>
      </div>

      {tenants === null ? (
        <div style={{ padding: '22px', textAlign: 'center', color: 'var(--text-soft)', fontSize: '13px' }}>Loading…</div>
      ) : tenants.length === 0 ? (
        <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-soft)', fontSize: '13px' }}>No workspaces yet.</div>
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
                  <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.04em', textTransform: 'uppercase', color: suspended ? 'var(--danger)' : 'var(--status-hired-strong)', background: suspended ? 'var(--danger-soft, rgba(200,50,50,0.08))' : 'var(--status-hired-soft)', border: `1px solid ${suspended ? 'var(--danger)' : 'var(--status-hired-border)'}`, borderRadius: 'var(--radius-pill)', padding: '1px 8px' }}>{suspended ? 'Suspended' : 'Active'}</span>
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
      window.showToast(`${item.name} could not be anonymized. Please try again.`, 'error');
    }
    setBusy('');
  };
  const anonymize = (item) => {
    if (busy) return;
    setConfirm({
      title: `Anonymize ${item.name}?`,
      message: 'This deletes personal data and removes attachments. This cannot be undone.',
      confirmLabel: 'Anonymize',
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
      window.showToast('The retention policy could not be saved. Please try again.', 'error');
    }
  };

  const runSweepOverdue = async () => {
    setSweeping(true);
    try {
      await window.RecruitApi.anonymizeOverdue();
      await reload();
    } catch {
      window.showToast('The overdue candidates could not be anonymized. Please try again.', 'error');
    }
    setSweeping(false);
  };
  const sweepOverdue = () => {
    if (sweeping) return;
    setConfirm({
      title: 'Anonymize all overdue candidates?',
      message: 'Every candidate whose deletion deadline has passed will be anonymized. This cannot be undone.',
      confirmLabel: 'Anonymize all',
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
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 700, color: 'var(--text-heading)', margin: 0, letterSpacing: '-0.01em' }}>Data retention (GDPR)</h2>
          <div style={{ fontSize: '12.5px', color: 'var(--text-soft)', marginTop: '2px' }}>Candidates who have had no active pipeline for a while. After the deletion deadline they are overdue — anonymize them during review, in bulk, or leave it to the automatic run.</div>
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
            Automatically anonymize overdue (runs on the server)
          </label>
        </div>
      )}

      {overdueCount > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginTop: '12px', padding: '10px 14px', background: 'var(--danger-soft, rgba(200,50,50,0.08))', border: '1px solid var(--danger)', borderRadius: 'var(--radius-md)' }}>
          <span style={{ fontSize: '12.5px', color: 'var(--danger)' }}>{overdueCount === 1 ? '1 candidate has' : `${overdueCount} candidates have`} passed the deletion deadline.</span>
          <button type="button" onClick={sweepOverdue} disabled={sweeping} style={{ cursor: sweeping ? 'default' : 'pointer', border: '1px solid var(--danger)', borderRadius: 'var(--radius-pill)', background: 'var(--danger)', color: '#fff', fontFamily: 'var(--font-mono)', fontSize: '11px', fontWeight: 600, padding: '5px 14px', whiteSpace: 'nowrap' }}>{sweeping ? 'Anonymizing…' : `Anonymize all overdue`}</button>
        </div>
      )}

      {items === null ? (
        <div style={{ padding: '28px', textAlign: 'center', color: 'var(--text-soft)', fontSize: '13px' }}>Loading…</div>
      ) : items.length === 0 ? (
        <div style={{ padding: '22px', textAlign: 'center', color: 'var(--text-soft)', fontSize: '13px' }}>Nothing due for review.</div>
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
  suggest: 'Document assistance',
  tailor: 'Application tailoring',
  parse: 'CV analysis',
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
          <div style={{ fontSize: '12.5px', color: 'var(--text-soft)', marginTop: '2px' }}>What your account has spent on AI so far. The costs are an estimate based on public list prices, not an invoice.</div>
        </div>
        {usage && usage.requests > 0 && (
          <a href={window.RecruitApi.usageAuditCsvUrl()} download title="Download the AI audit log per call (CSV)" style={{ flexShrink: 0, textDecoration: 'none', fontFamily: 'var(--font-mono)', fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-pill)', padding: '5px 12px' }}>Audit log (CSV)</a>
        )}
      </div>

      {error ? (
        <div style={{ padding: '22px', textAlign: 'center', color: 'var(--text-soft)', fontSize: '13px' }}>Usage could not be loaded.</div>
      ) : usage === null ? (
        <div style={{ padding: '28px', textAlign: 'center', color: 'var(--text-soft)', fontSize: '13px' }}>Loading…</div>
      ) : usage.requests === 0 ? (
        <div style={{ padding: '22px', textAlign: 'center', color: 'var(--text-soft)', fontSize: '13px' }}>No AI usage yet. A pitch, ATS score or cover letter shows up here once you create one.</div>
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
            ? `${user.email} is confirmed.`
            : state === 'sent'
              ? `Sent — check ${user.email} and click the link.`
              : state === 'error'
                ? 'The email could not be sent. Please try again shortly.'
                : `We will send a confirmation link to ${user.email}. Nothing is blocked in the meantime.`}
        </div>
      </div>
      {!verified && (
        <SV.Button variant="outline" size="sm" disabled={state === 'sending'} onClick={resend}>
          {state === 'sending' ? 'Sending…' : state === 'sent' ? 'Resend' : 'Send link'}
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
  const label = { saving: 'Saving…', saved: 'Saved — visible on next load', error: 'Could not save' };
  return (
    <div style={{ background: 'var(--surface-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-sm)', padding: '22px 24px' }}>
      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 700, color: 'var(--text-heading)', margin: 0, letterSpacing: '-0.01em' }}>Your name</h2>
      <div style={{ fontSize: '12.5px', color: 'var(--text-soft)', marginTop: '2px', marginBottom: '14px' }}>Shown in the greeting and your pinned profile — set it so the app greets you by name, not by email.</div>
      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
        <input
          value={name}
          onChange={(e) => { setName(e.target.value); setState('idle'); }}
          placeholder={loaded ? 'e.g. Nora Kessler' : 'Loading…'}
          aria-label="Your name"
          style={{ flex: 1, minWidth: '200px', border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-md)', background: 'var(--surface-card)', fontFamily: 'var(--font-body)', fontSize: '13.5px', color: 'var(--text-heading)', padding: '10px 12px', outline: 'none' }}
        />
        <SV.Button
          size="sm"
          disabled={!loaded || state === 'saving' || !name.trim()}
          title={!loaded ? 'Loading…' : !name.trim() ? 'Please enter a name first.' : undefined}
          onClick={save}
        >
          Save
        </SV.Button>
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
    ['light', 'Light'],
    ['dark', 'Dark'],
    ['system', 'System'],
  ];
  const modeLabel = mode === 'light' ? 'Light "Vivid"' : mode === 'dark' ? 'Dark "Classic"' : mode;
  return (
    <div style={{ background: 'var(--surface-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-sm)', padding: '22px 24px' }}>
      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 700, color: 'var(--text-heading)', margin: 0, letterSpacing: '-0.01em' }}>Appearance</h2>
      <div style={{ fontSize: '12.5px', color: 'var(--text-soft)', marginTop: '2px' }}>
        Choose how myJob looks. By default it follows your system setting. Light is "Vivid" (royal accent), dark is "Classic" (live orange).
      </div>
      <div role="group" aria-label="Appearance" style={{ display: 'inline-flex', gap: '4px', marginTop: '14px', padding: '4px', background: 'var(--surface-sunk)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
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
        {choice ? `${modeLabel} active — your choice is saved for this browser.` : `Follows your system (${modeLabel}).`}
      </div>
    </div>
  );
}

function SettingsView({ user, onLogout }) {
  return (
    <div style={{ maxWidth: '780px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
      <ProfileCard user={user} />
      <EmailVerificationCard user={user} />
      <AppearanceCard />
      {onLogout && (
        <div style={{ background: 'var(--surface-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-sm)', padding: '18px 24px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ flex: 1 }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '16px', fontWeight: 700, color: 'var(--text-heading)', margin: 0 }}>Session</h2>
            <div style={{ fontSize: '12.5px', color: 'var(--text-soft)', marginTop: '2px' }}>Sign out of this device.</div>
          </div>
          <SV.Button variant="outline" size="sm" iconLeft={<SV.Icon name="logout" size={15} />} onClick={onLogout}>Sign out</SV.Button>
        </div>
      )}
      <AiSetupCard />
      <WorkspaceSettingsCard />
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
