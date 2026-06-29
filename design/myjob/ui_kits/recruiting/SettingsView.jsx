/* SettingsView — Gemini key, the provider-agnostic AI framework note, and
   per-task agentic autonomy. A workspace destination (not a separate app). */
const SV = window.MyJobDesignSystem_f3658e;
const SV_KEY = 'myjob.geminiKey';

function SvSection({ icon, title, sub, children }) {
  return (
    <div style={{ background: 'var(--surface-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-sm)', padding: '22px 24px', marginBottom: '18px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '11px', marginBottom: '16px' }}>
        <span style={{ width: '34px', height: '34px', borderRadius: 'var(--radius-md)', display: 'grid', placeItems: 'center', background: 'var(--surface-sunk)', color: 'var(--text-muted)', flexShrink: 0 }}><SV.Icon name={icon} size={18} /></span>
        <div><h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--fs-lg)', fontWeight: 600, color: 'var(--text-heading)', margin: 0, letterSpacing: '-0.01em' }}>{title}</h2><div style={{ fontSize: '12px', color: 'var(--text-soft)', marginTop: '1px' }}>{sub}</div></div>
      </div>
      {children}
    </div>
  );
}

function AutoRow({ title, desc, value, onChange, levels }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', padding: '13px 0', borderBottom: '1px solid var(--border)' }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-heading)' }}>{title}</div>
        <div style={{ fontSize: '12px', color: 'var(--text-soft)', marginTop: '2px' }}>{desc}</div>
      </div>
      <div style={{ display: 'inline-flex', background: 'var(--surface-sunk)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '2px', gap: '2px', flexShrink: 0 }}>
        {levels.map((l) => <button key={l} onClick={() => onChange(l)} style={{ appearance: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: '11px', fontWeight: value === l ? 600 : 500, padding: '5px 9px', borderRadius: 'var(--radius-sm)', background: value === l ? 'var(--surface-card)' : 'transparent', color: value === l ? 'var(--text-heading)' : 'var(--text-muted)', boxShadow: value === l ? 'var(--shadow-sm)' : 'none', whiteSpace: 'nowrap' }}>{l}</button>)}
      </div>
    </div>
  );
}

function SettingsView() {
  const [key, setKey] = React.useState(() => { try { return localStorage.getItem(SV_KEY) || ''; } catch (e) { return ''; } });
  const [show, setShow] = React.useState(false);
  const [saved, setSaved] = React.useState(false);
  const [model, setModel] = React.useState('gemini-2.0-flash');
  const [src, setSrc] = React.useState('Autonom'); const [apply, setApply] = React.useState('Mit Freigabe'); const [cv, setCv] = React.useState('Vorschlag');
  const save = () => { try { localStorage.setItem(SV_KEY, key); } catch (e) {} setSaved(true); setTimeout(() => setSaved(false), 2200); };

  return (
    <div style={{ maxWidth: '720px' }}>
      <SvSection icon="zap" title="KI · Gemini" sub="Schlüssel für AI-Anschreiben, CV-Zuschnitt und den Agentic-Modus">
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10.5px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-soft)', marginBottom: '7px' }}>Gemini API-Key</div>
        <div style={{ display: 'flex', gap: '9px' }}>
          <input type={show ? 'text' : 'password'} value={key} onChange={(e) => setKey(e.target.value)} placeholder="AIza…" autoComplete="off" spellCheck="false" style={{ flex: 1, border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-md)', background: 'var(--surface-card)', fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--text-heading)', padding: '10px 12px', outline: 'none' }} />
          <button onClick={() => setShow((s) => !s)} title="anzeigen" style={{ cursor: 'pointer', border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-md)', background: 'var(--surface-card)', color: 'var(--text-muted)', padding: '0 12px' }}><SV.Icon name="eye" size={16} /></button>
          <SV.Button size="md" onClick={save}>Speichern</SV.Button>
        </div>
        <div style={{ fontSize: '12px', color: saved ? 'var(--success)' : 'var(--text-soft)', marginTop: '7px' }}>{saved ? '✓ Gespeichert · lokal im Browser' : 'Lokal gespeichert. Der Backend-Aufruf läuft serverseitig über das Framework unten.'}</div>
        <div style={{ marginTop: '16px', fontFamily: 'var(--font-mono)', fontSize: '10.5px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-soft)', marginBottom: '7px' }}>Modell</div>
        <select value={model} onChange={(e) => setModel(e.target.value)} style={{ width: '100%', padding: '10px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-strong)', background: 'var(--surface-card)', fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--text-heading)' }}>
          <option value="gemini-2.0-flash">gemini-2.0-flash · schnell</option>
          <option value="gemini-2.0-pro">gemini-2.0-pro · stark</option>
        </select>
      </SvSection>

      <SvSection icon="code" title="KI-Framework" sub="Provider-agnostisch — Gemini ist nur ein austauschbarer Anbieter">
        <div style={{ padding: '14px 16px', border: '1px dashed var(--border-strong)', borderRadius: 'var(--radius-md)', background: 'var(--surface-subtle)', fontSize: '12.5px', color: 'var(--text-muted)', lineHeight: 1.6 }}>
          Die AI-Integration läuft über ein <b style={{ color: 'var(--text-heading)' }}>provider-agnostisches Framework</b> — das Node.js-Pendant zu <code style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--accent-strong)' }}>Microsoft.Extensions.AI</code>: die <b style={{ color: 'var(--text-heading)' }}>Vercel AI SDK</b> / LangChain.js. Eine Abstraktion treibt CV-Zuschnitt, Anschreiben und den Agentic-Modus; der Anbieter (Gemini → OpenAI → lokal) ist mit einer Zeile wechselbar.
        </div>
      </SvSection>

      <SvSection icon="users" title="Agentic-Modus" sub="Wie weit der Agent pro Aufgabe selbst handeln darf">
        <AutoRow title="Sourcing" desc="Nachts passende Stellen finden (reversibel)." value={src} onChange={setSrc} levels={['Aus', 'Vorschlag', 'Autonom']} />
        <AutoRow title="Bewerben im Auftrag" desc="Echte Menschen — braucht immer deine Freigabe." value={apply} onChange={setApply} levels={['Aus', 'Mit Freigabe']} />
        <AutoRow title="CV- & Anschreiben-Zuschnitt" desc="Entwurf wird grau vorgeschlagen — übernehmen oder verwerfen." value={cv} onChange={setCv} levels={['Aus', 'Vorschlag']} />
      </SvSection>
    </div>
  );
}

Object.assign(window, { SettingsView });
