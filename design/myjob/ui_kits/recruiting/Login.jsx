/* Login.jsx — the myJob auth screen. A branded two-column layout (ink brand
   panel + working card), a segmented Log in / Create account switch, email +
   password, and Google/LinkedIn buttons shown only when the backend reports
   them enabled. Mirrors the Elliott Wave Analyzer auth UX, rebranded to myJob. */
const L = window.MyJobDesignSystem_f3658e;

const POINTS = [
  'Mandates, talent pool and placements in one workspace',
  'Apply candidates on their behalf, track every stage',
  'Fees and funnel at a glance',
];

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

function LoginScreen({ providers, onAuthed }) {
  const [mode, setMode] = React.useState('login');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [confirm, setConfirm] = React.useState('');
  const [error, setError] = React.useState(null);
  const [loading, setLoading] = React.useState(false);

  const isRegister = mode === 'register';
  const mismatch = isRegister && confirm.length > 0 && confirm !== password;
  const canSubmit =
    !loading &&
    email.length > 0 &&
    password.length > 0 &&
    (!isRegister || (!mismatch && confirm.length > 0 && password.length >= 8));

  const submit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    setLoading(true);
    setError(null);
    try {
      const user = isRegister
        ? await window.RecruitApi.authRegister(email, password)
        : await window.RecruitApi.authLogin(email, password);
      onAuthed(user);
    } catch (err) {
      setError((err && err.message) || 'Something went wrong');
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

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--app-bg)' }}>
      {/* brand panel */}
      <aside
        className="auth-brand"
        style={{
          width: '44%', flexShrink: 0, display: 'flex', flexDirection: 'column',
          gap: '28px', padding: '52px 48px', color: '#fff',
          background: 'linear-gradient(165deg, var(--ink-850) 0%, var(--ink-900) 100%)',
          borderRight: '1px solid var(--sidebar-border)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '11px' }}>
          <img src="/design/myjob/assets/logo/myjob-mark.svg" width="34" height="34" alt="" />
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '20px', letterSpacing: '-0.02em' }}>
              <span style={{ color: 'var(--accent-on-dark)' }}>my</span>Job
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--sidebar-soft)', marginTop: '2px' }}>
              Recruiting suite
            </div>
          </div>
        </div>

        <div style={{ marginTop: 'auto' }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '34px', fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1.1, margin: 0 }}>
            Run your desk on myJob.
          </h1>
          <p style={{ fontSize: '15px', color: 'var(--sidebar-muted)', marginTop: '14px', maxWidth: '36ch' }}>
            Mandates, talents and placements in one calm workspace — from first sighting to booked fee.
          </p>
        </div>

        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {POINTS.map((p) => (
            <li key={p} style={{ display: 'flex', alignItems: 'center', gap: '11px', fontSize: '14px', color: 'var(--sidebar-muted)' }}>
              <span style={{ display: 'grid', placeItems: 'center', width: '20px', height: '20px', borderRadius: '50%', background: 'var(--accent-soft)', flexShrink: 0 }}>
                <L.Icon name="check" size={12} style={{ color: 'var(--accent-on-dark)' }} />
              </span>
              {p}
            </li>
          ))}
        </ul>

        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--sidebar-soft)', marginTop: 'auto' }}>
          We connect partners — talent to mandate.
        </p>
      </aside>

      {/* form card */}
      <main style={{ flex: 1, display: 'grid', placeItems: 'center', padding: '32px' }}>
        <form onSubmit={submit} aria-label={isRegister ? 'Create account' : 'Log in'} style={{ width: '100%', maxWidth: '380px' }}>
          <div style={{ display: 'flex', gap: '4px', padding: '4px', borderRadius: 'var(--radius-pill)', background: 'var(--surface-sunk)', border: '1px solid var(--border)', marginBottom: '24px' }}>
            {[['login', 'Log in'], ['register', 'Create account']].map(([m, label]) => (
              <button
                key={m}
                type="button"
                onClick={() => { setMode(m); setError(null); }}
                style={{
                  flex: 1, padding: '8px', borderRadius: 'var(--radius-pill)', border: 'none', cursor: 'pointer',
                  fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: 600,
                  background: mode === m ? 'var(--accent)' : 'transparent',
                  color: mode === m ? 'var(--accent-contrast)' : 'var(--text-soft)',
                }}
              >
                {label}
              </button>
            ))}
          </div>

          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '22px', fontWeight: 700, color: 'var(--text-heading)', margin: 0, letterSpacing: '-0.02em' }}>
            {isRegister ? 'Create your account' : 'Welcome back'}
          </h2>
          <p style={{ fontSize: '13.5px', color: 'var(--text-soft)', marginTop: '4px', marginBottom: '22px' }}>
            {isRegister ? 'Start running your recruiting desk.' : 'Pick up where you left off.'}
          </p>

          {(providers.google || providers.linkedin) && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '9px', marginBottom: '18px' }}>
              {providers.google && (
                <SocialButton href="/api/v1/auth/google/login" mark="G">Continue with Google</SocialButton>
              )}
              {providers.linkedin && (
                <SocialButton href="/api/v1/auth/linkedin/login" mark="in">Continue with LinkedIn</SocialButton>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '6px 0' }}>
                <span style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-soft)' }}>or</span>
                <span style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
              </div>
            </div>
          )}

          <label style={labelStyle}>
            <span style={labelText}>Email</span>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" placeholder="you@example.com" style={fieldStyle} />
          </label>

          <label style={labelStyle}>
            <span style={labelText}>Password</span>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete={isRegister ? 'new-password' : 'current-password'} placeholder="••••••••" style={fieldStyle} />
          </label>

          {isRegister && (
            <label style={labelStyle}>
              <span style={labelText}>
                Confirm password {mismatch && <span style={{ color: 'var(--danger)' }}>— doesn’t match</span>}
              </span>
              <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required autoComplete="new-password" placeholder="••••••••" style={fieldStyle} />
            </label>
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
            {loading ? 'Please wait…' : isRegister ? 'Create account' : 'Log in'}
          </button>

          <p style={{ fontSize: '13px', color: 'var(--text-soft)', textAlign: 'center', marginTop: '18px' }}>
            {isRegister ? 'Already have an account? ' : 'New to myJob? '}
            <button type="button" onClick={() => { setMode(isRegister ? 'login' : 'register'); setError(null); }} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--accent-strong)', fontWeight: 600, fontSize: '13px' }}>
              {isRegister ? 'Log in' : 'Create one'}
            </button>
          </p>
        </form>
      </main>
    </div>
  );
}

Object.assign(window, { LoginScreen });
