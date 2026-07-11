/* Login.jsx — the myJob auth screen. A branded two-column layout (ink brand
   panel + working card), a segmented Log in / Create account switch, email +
   password, and Google/LinkedIn buttons shown only when the backend reports
   them enabled. Also hosts the password-reset flow: a "Forgot password?" request
   form, and a set-new-password form when the page is opened with a ?reset_token.
   Mirrors the Elliott Wave Analyzer auth UX, rebranded to myJob. */
const L = window.MyJobDesignSystem_5611b7;

const POINTS = [
  'Mandate, Talent-Pool und Platzierungen in einem Workspace',
  'Kandidat:innen stellvertretend bewerben, jede Stufe verfolgen',
  'Honorare und Funnel auf einen Blick',
];

function readQueryToken(name) {
  try {
    return new URLSearchParams(window.location.search).get(name) || '';
  } catch {
    return '';
  }
}

function SocialButton({ href, mark, children }) {
  return (
    <a
      href={href}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
        width: '100%', padding: '11px', borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border-strong)', background: 'var(--surface-card)',
        color: 'var(--text-heading)', textDecoration: 'none', fontWeight: 600, fontSize: '14px',
      }}
    >
      <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700 }}>{mark}</span>
      {children}
    </a>
  );
}

function LoginScreen({ providers, onAuthed, initialNotice }) {
  const initialToken = React.useState(() => readQueryToken('reset_token'))[0];
  // An emailed invitation opens the app with ?invite_token= — accept it here (ADR-0035).
  const inviteToken = React.useState(() => readQueryToken('invite_token'))[0];
  // modes: 'login' | 'register' | 'forgot' | 'reset' | 'invite'
  const [mode, setMode] = React.useState(inviteToken ? 'invite' : initialToken ? 'reset' : 'login');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [confirm, setConfirm] = React.useState('');
  const [error, setError] = React.useState(null);
  const [notice, setNotice] = React.useState(initialNotice || null);
  const [loading, setLoading] = React.useState(false);

  const isRegister = mode === 'register';
  const isForgot = mode === 'forgot';
  const isReset = mode === 'reset';
  const isInvite = mode === 'invite';
  // Invite + reset are both "set a password" flows: no email field, confirm required.
  const passwordOnly = isReset || isInvite;
  const needsConfirm = isRegister || passwordOnly;
  const mismatch = needsConfirm && confirm.length > 0 && confirm !== password;
  const canSubmit =
    !loading &&
    (isForgot
      ? email.length > 0
      : passwordOnly
        ? !mismatch && password.length >= 8 && confirm.length > 0
        : email.length > 0 &&
          password.length > 0 &&
          (!isRegister || (!mismatch && confirm.length > 0 && password.length >= 8)));

  const goMode = (m) => {
    setMode(m);
    setError(null);
    setNotice(null);
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    setLoading(true);
    setError(null);
    setNotice(null);
    try {
      if (isForgot) {
        await window.RecruitApi.requestPasswordReset(email);
        setNotice('Falls diese E-Mail registriert ist, haben wir dir einen Reset-Link geschickt. Sieh in deinem Postfach nach.');
      } else if (isReset) {
        await window.RecruitApi.confirmPasswordReset(initialToken, password);
        // Drop the token from the URL so a refresh doesn't reopen the reset form.
        try {
          window.history.replaceState({}, '', window.location.pathname);
        } catch {
          /* ignore */
        }
        setPassword('');
        setConfirm('');
        setMode('login');
        setNotice('Dein Passwort wurde zurückgesetzt. Bitte melde dich an.');
      } else if (isInvite) {
        const user = await window.RecruitApi.acceptInvite(inviteToken, password);
        // Drop the token from the URL so a refresh doesn't reopen the accept form.
        try {
          window.history.replaceState({}, '', window.location.pathname);
        } catch {
          /* ignore */
        }
        onAuthed(user);
      } else {
        const user = isRegister
          ? await window.RecruitApi.authRegister(email, password)
          : await window.RecruitApi.authLogin(email, password);
        onAuthed(user);
      }
    } catch (err) {
      setError((err && err.message) || 'Etwas ist schiefgelaufen');
    } finally {
      setLoading(false);
    }
  };

  const fieldStyle = {
    width: '100%', padding: '11px 13px', borderRadius: 'var(--radius-md)',
    border: '1px solid var(--border-strong)', background: 'var(--surface-card)',
    color: 'var(--text-heading)', fontFamily: 'var(--font-body)', fontSize: '14px', outline: 'none',
  };
  const labelStyle = { display: 'block', marginBottom: '14px' };
  const labelText = {
    display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-soft)', marginBottom: '6px',
  };
  const linkButton = {
    background: 'none', border: 'none', padding: 0, cursor: 'pointer',
    color: 'var(--accent-strong)', fontWeight: 600, fontSize: '13px',
  };

  const title = isForgot
    ? 'Passwort zurücksetzen'
    : isInvite
      ? 'Einladung annehmen'
      : isReset
        ? 'Neues Passwort wählen'
        : isRegister
          ? 'Erstelle dein Konto'
          : 'Willkommen zurück';
  const subtitle = isForgot
    ? 'Gib deine E-Mail ein und wir schicken dir einen Reset-Link.'
    : isInvite
      ? 'Setze ein Passwort, um dem Workspace deines Teams beizutreten.'
      : isReset
        ? 'Wähle ein neues Passwort für dein Konto.'
        : isRegister
          ? 'Starte deinen Recruiting-Desk.'
          : 'Mach dort weiter, wo du aufgehört hast.';
  const submitLabel = isForgot
    ? 'Reset-Link senden'
    : isInvite
      ? 'Einladung annehmen'
      : isReset
        ? 'Neues Passwort setzen'
        : isRegister
          ? 'Konto erstellen'
          : 'Anmelden';

  return (
    <div style={{ display: 'flex', minHeight: '100dvh', background: 'var(--app-bg)' }}>
      {/* brand panel — Royal hero band with the Now-Split mark and a single
          live-orange glow (Vivid 2026). */}
      <aside
        className="auth-brand"
        style={{
          position: 'relative', width: '44%', flexShrink: 0, display: 'flex', flexDirection: 'column',
          gap: '28px', padding: '52px 48px', color: '#fff', overflow: 'hidden',
          background: 'linear-gradient(158deg, var(--royal-500) 0%, var(--royal-700) 100%)',
        }}
      >
        {/* the one permitted live-orange glow on the royal band */}
        <span aria-hidden style={{ position: 'absolute', width: '460px', height: '460px', right: '-160px', bottom: '-180px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,83,32,0.55) 0%, rgba(255,83,32,0) 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '13px' }}>
          <L.Logomark size={40} />
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '22px', letterSpacing: '-0.02em', lineHeight: 1 }}>
              <span style={{ color: '#fff' }}>my</span><span style={{ color: 'var(--live)' }}>Job</span>
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.62)', marginTop: '3px' }}>
              Vermittler-Workspace
            </div>
          </div>
        </div>

        <div style={{ position: 'relative', marginTop: 'auto' }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '36px', fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1.08, margin: 0 }}>
            Dein Recruiting-Desk — an einem Ort.
          </h1>
          <p style={{ fontSize: '15px', color: 'rgba(255,255,255,0.82)', marginTop: '14px', maxWidth: '38ch', lineHeight: 1.6 }}>
            Mandate, Talente und Platzierungen in einem ruhigen Workspace — von der ersten Sichtung bis zum gebuchten Honorar.
          </p>
        </div>

        <ul style={{ position: 'relative', listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {POINTS.map((p) => (
            <li key={p} style={{ display: 'flex', alignItems: 'center', gap: '11px', fontSize: '14px', color: 'rgba(255,255,255,0.86)' }}>
              <span style={{ display: 'grid', placeItems: 'center', width: '22px', height: '22px', borderRadius: '50%', background: 'rgba(255,255,255,0.16)', flexShrink: 0 }}>
                <L.Icon name="check" size={12} style={{ color: '#fff' }} />
              </span>
              {p}
            </li>
          ))}
        </ul>

        <p style={{ position: 'relative', fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.55)', marginTop: 'auto' }}>
          We connect partners — Talent zu Mandat.
        </p>
      </aside>

      {/* form card */}
      {/* Safe-area padding keeps the form clear of the notch / home indicator in
          the installed shell; env() insets are 0 in a browser tab (#202). */}
      <main style={{ flex: 1, display: 'grid', placeItems: 'center', padding: 'max(32px, env(safe-area-inset-top)) max(20px, env(safe-area-inset-right)) max(32px, env(safe-area-inset-bottom)) max(20px, env(safe-area-inset-left))' }}>
        <form onSubmit={submit} aria-label={title} style={{ width: '100%', maxWidth: '380px' }}>
          {!isForgot && !passwordOnly && (
            <div style={{ display: 'flex', gap: '4px', padding: '4px', borderRadius: 'var(--radius-pill)', background: 'var(--surface-sunk)', border: '1px solid var(--border)', marginBottom: '24px' }}>
              {[['login', 'Anmelden'], ['register', 'Konto erstellen']].map(([m, label]) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => goMode(m)}
                  style={{
                    flex: 1, minHeight: '44px', padding: '8px', borderRadius: 'var(--radius-pill)', border: 'none', cursor: 'pointer',
                    fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: 600,
                    background: mode === m ? 'var(--accent)' : 'transparent',
                    color: mode === m ? 'var(--accent-contrast)' : 'var(--text-soft)',
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          )}

          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '22px', fontWeight: 700, color: 'var(--text-heading)', margin: 0, letterSpacing: '-0.02em' }}>
            {title}
          </h2>
          <p style={{ fontSize: '13.5px', color: 'var(--text-soft)', marginTop: '4px', marginBottom: '22px' }}>
            {subtitle}
          </p>

          {notice && (
            <p role="status" style={{ fontSize: '13px', color: 'var(--accent-strong)', background: 'var(--accent-soft)', border: '1px solid var(--accent)', borderRadius: 'var(--radius-md)', padding: '9px 12px', margin: '0 0 16px' }}>
              {notice}
            </p>
          )}

          {!isForgot && !passwordOnly && (providers.google || providers.linkedin) && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '9px', marginBottom: '18px' }}>
              {providers.google && (
                <SocialButton href="/api/v1/auth/google/login" mark="G">Weiter mit Google</SocialButton>
              )}
              {providers.linkedin && (
                <SocialButton href="/api/v1/auth/linkedin/login" mark="in">Weiter mit LinkedIn</SocialButton>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '6px 0' }}>
                <span style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-soft)' }}>oder</span>
                <span style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
              </div>
            </div>
          )}

          {!passwordOnly && (
            <label style={labelStyle}>
              <span style={labelText}>E-Mail</span>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" placeholder="you@example.com" style={fieldStyle} />
            </label>
          )}

          {!isForgot && (
            <label style={labelStyle}>
              <span style={labelText}>{passwordOnly ? 'Neues Passwort' : 'Passwort'}</span>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete={needsConfirm ? 'new-password' : 'current-password'} placeholder="••••••••" style={fieldStyle} />
            </label>
          )}

          {needsConfirm && (
            <label style={labelStyle}>
              <span style={labelText}>
                Passwort bestätigen {mismatch && <span style={{ color: 'var(--danger)' }}>— stimmt nicht überein</span>}
              </span>
              <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required autoComplete="new-password" placeholder="••••••••" style={fieldStyle} />
            </label>
          )}

          {!isForgot && !passwordOnly && !isRegister && (
            <p style={{ textAlign: 'right', margin: '-6px 0 16px' }}>
              <button type="button" onClick={() => goMode('forgot')} style={linkButton}>
                Passwort vergessen?
              </button>
            </p>
          )}

          {error && (
            <p role="alert" style={{ fontSize: '13px', color: 'var(--danger)', background: 'var(--danger-soft)', border: '1px solid var(--danger)', borderRadius: 'var(--radius-md)', padding: '9px 12px', margin: '0 0 16px' }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={!canSubmit}
            style={{
              width: '100%', padding: '12px', borderRadius: 'var(--radius-pill)', border: 'none',
              cursor: canSubmit ? 'pointer' : 'not-allowed', fontFamily: 'var(--font-body)', fontSize: '14px', fontWeight: 600,
              background: 'var(--accent)', color: 'var(--accent-contrast)', opacity: canSubmit ? 1 : 0.55,
            }}
          >
            {loading ? 'Bitte warten…' : submitLabel}
          </button>

          {(isForgot || passwordOnly) && (
            <p style={{ fontSize: '13px', color: 'var(--text-soft)', textAlign: 'center', marginTop: '18px' }}>
              <button type="button" onClick={() => goMode('login')} style={linkButton}>
                ← Zurück zur Anmeldung
              </button>
            </p>
          )}

          {!isForgot && !passwordOnly && (
            <p style={{ fontSize: '13px', color: 'var(--text-soft)', textAlign: 'center', marginTop: '18px' }}>
              {isRegister ? 'Schon ein Konto? ' : 'Neu bei myJob? '}
              <button type="button" onClick={() => goMode(isRegister ? 'login' : 'register')} style={linkButton}>
                {isRegister ? 'Anmelden' : 'Konto erstellen'}
              </button>
            </p>
          )}
        </form>
      </main>
    </div>
  );
}

Object.assign(window, { LoginScreen });
