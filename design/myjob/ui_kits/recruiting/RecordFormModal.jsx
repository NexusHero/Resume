/* RecordFormModal — a real create form (replaces the window.prompt() flows) for
   mandates, talents and placements. Field configs live in RECORD_FORMS; the
   modal is generic and validates required fields before calling onSubmit. */
const RF = window.MyJobDesignSystem_5611b7;

/* A monetary amount: optional currency symbol, digits with dot/comma/space
   grouping, optional trailing symbol. Deliberately lenient about grouping
   (19.000 €, 19,000, €19000) but it must be a number, not free text. Mirrors
   the server's moneyString check in domain/placement.ts. */
const MONEY_RE = /^[€$£\s]*\d[\d.,\s]*[€$£]?$/;

const RECORD_FORMS = {
  mandate: {
    title: 'Neues Mandat',
    subtitle: 'Ein Suchmandat für einen Klienten öffnen',
    editTitle: 'Mandat bearbeiten',
    editSubmitLabel: 'Änderungen speichern',
    icon: 'briefcase',
    submitLabel: 'Mandat anlegen',
    fields: [
      { name: 'client', label: 'Klient', icon: 'building', required: true },
      { name: 'role', label: 'Rolle', icon: 'briefcase', required: true },
      { name: 'location', label: 'Standort', icon: 'pin', required: true },
      { name: 'fee', label: 'Honorar', icon: 'trend', placeholder: 'z. B. 22 %' },
      { name: 'feeValue', label: 'Honorarwert', placeholder: 'z. B. 17.160 €' },
      { name: 'deadline', label: 'Frist', placeholder: 'JJJJ-MM-TT' },
      { name: 'priority', label: 'Priorität', type: 'select', options: [{ value: 'high', label: 'hoch' }, { value: 'medium', label: 'mittel' }, { value: 'low', label: 'niedrig' }], default: 'medium' },
      { name: 'status', label: 'Status', type: 'select', options: [{ value: 'active', label: 'aktiv' }, { value: 'paused', label: 'pausiert' }, { value: 'closed', label: 'geschlossen' }], default: 'active' },
      { name: 'jobText', label: 'Stellenanzeige', type: 'textarea', full: true, rows: 5, placeholder: 'Stellenausschreibung einfügen — steuert Matching, ATS-Score, AGG-Check und Kandidat:innen-Vorbereitung' },
    ],
  },
  talent: {
    title: 'Talent hinzufügen',
    subtitle: 'Kandidat:in zum Pool hinzufügen',
    icon: 'user',
    submitLabel: 'Talent hinzufügen',
    fields: [
      { name: 'name', label: 'Name', icon: 'user', required: true },
      { name: 'role', label: 'Rolle', icon: 'briefcase' },
      { name: 'headline', label: 'Kurzprofil' },
      { name: 'location', label: 'Standort', icon: 'pin' },
      { name: 'email', label: 'E-Mail', type: 'email' },
      { name: 'phone', label: 'Telefon' },
      { name: 'availability', label: 'Verfügbarkeit', placeholder: 'z. B. sofort' },
      { name: 'salary', label: 'Gehaltsvorstellung' },
      { name: 'skills', label: 'Skills', full: true, placeholder: 'Kommagetrennt, z. B. React, TypeScript — steuert Matching' },
    ],
  },
  placement: {
    title: 'Platzierung hinzufügen',
    subtitle: 'Eine gebuchte Platzierung erfassen',
    editTitle: 'Platzierung bearbeiten',
    editSubmitLabel: 'Änderungen speichern',
    icon: 'award',
    submitLabel: 'Platzierung hinzufügen',
    fields: [
      { name: 'candidateName', label: 'Kandidat:in', icon: 'user', required: true },
      { name: 'candidateRole', label: 'Rolle', icon: 'briefcase' },
      { name: 'client', label: 'Klient', icon: 'building', required: true },
      { name: 'start', label: 'Start', placeholder: 'JJJJ-MM-TT' },
      { name: 'fee', label: 'Honorar', placeholder: 'z. B. 19.000 €', money: true },
      { name: 'status', label: 'Status', type: 'select', options: [{ value: 'probation', label: 'Probezeit' }, { value: 'invoiced', label: 'in Rechnung gestellt' }, { value: 'paid', label: 'bezahlt' }], default: 'probation' },
    ],
  },
};

function RecordFormModal({ kind, record, prefill, onClose, onSubmit, onDelete }) {
  const { isMobile } = window.useViewport ? window.useViewport() : { isMobile: false };
  const form = RECORD_FORMS[kind];
  const editing = record != null;
  // `record` = edit an existing row; `prefill` = create, but seed the fields
  // (e.g. a mandate drafted from a job posting).
  const seed = record ?? prefill;
  const [values, setValues] = React.useState(() => {
    const init = {};
    form.fields.forEach((f) => {
      const fromSeed = seed ? seed[f.name] : undefined;
      init[f.name] = fromSeed != null ? fromSeed : f.default != null ? f.default : '';
    });
    return init;
  });
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState('');
  // Focus trap, Esc-to-close and focus-return (#203).
  const dialogRef = React.useRef(null);
  const closeIfIdle = React.useCallback(() => { if (!busy) onClose(); }, [busy, onClose]);
  window.useDialog(dialogRef, closeIfIdle);

  const set = (name, v) => setValues((s) => ({ ...s, [name]: v }));
  const missing = form.fields.filter((f) => f.required && !String(values[f.name]).trim());
  // A monetary field (e.g. a placement fee) must be a real amount — a currency
  // symbol, digits and separators — never free text. Empty is allowed here;
  // `required` is what makes a field mandatory.
  const badMoney = form.fields.filter(
    (f) => f.money && String(values[f.name]).trim() && !MONEY_RE.test(String(values[f.name]).trim()),
  );

  const submit = (e) => {
    e.preventDefault();
    if (missing.length) {
      setError(`Bitte ausfüllen: ${missing.map((f) => f.label).join(', ')}`);
      return;
    }
    if (badMoney.length) {
      setError(`Bitte einen gültigen Betrag eingeben für: ${badMoney.map((f) => f.label).join(', ')}`);
      return;
    }
    setBusy(true);
    setError('');
    Promise.resolve(onSubmit(values))
      .then(() => onClose())
      .catch(() => {
        setError('Konnte nicht gespeichert werden. Bitte erneut versuchen.');
        setBusy(false);
      });
  };

  // Delete is reversible via the undo snackbar (#200), so no blocking confirm —
  // close the form and let onDelete schedule the deferred delete + Undo toast.
  const remove = () => {
    setBusy(true);
    setError('');
    Promise.resolve(onDelete())
      .then(() => onClose())
      .catch(() => {
        setError('Konnte nicht gelöscht werden. Bitte erneut versuchen.');
        setBusy(false);
      });
  };

  return (
    <>
      <div onClick={busy ? undefined : onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(8,11,18,0.45)', backdropFilter: 'blur(2px)', zIndex: 50, animation: 'fadeIn .2s ease' }} />
      <form ref={dialogRef} role="dialog" aria-modal="true" aria-label={editing ? form.editTitle : form.title} onSubmit={submit} style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 51, width: 'min(640px, 94vw)', maxHeight: '90vh', display: 'flex', flexDirection: 'column', background: 'var(--surface-card)', borderRadius: 'var(--radius-xl)', boxShadow: 'var(--shadow-lg)', overflow: 'hidden', animation: 'popIn .24s cubic-bezier(0.16,1,0.3,1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '13px', padding: '18px 22px', borderBottom: '1px solid var(--border)' }}>
          <span style={{ width: '38px', height: '38px', borderRadius: 'var(--radius-md)', background: 'var(--accent)', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><RF.Icon name={form.icon} size={18} /></span>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '17px', fontWeight: 700, color: 'var(--text-heading)' }}>{editing ? form.editTitle : form.title}</div>
            <div style={{ fontSize: '12.5px', color: 'var(--text-soft)' }}>{form.subtitle}</div>
          </div>
          <RF.IconButton icon="x" label="Schließen" variant="ghost" type="button" onClick={onClose} />
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 22px', display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '14px', alignItems: 'start' }}>
          {form.fields.map((f) =>
            f.type === 'select' ? (
              <RF.Select key={f.name} label={f.label} options={f.options} value={values[f.name]} onChange={(e) => set(f.name, e.target.value)} aria-label={f.label} />
            ) : f.type === 'textarea' ? (
              <RF.Textarea key={f.name} label={f.label} rows={f.rows || 4} placeholder={f.placeholder} value={values[f.name]} onChange={(e) => set(f.name, e.target.value)} aria-label={f.label} wrapStyle={f.full ? { gridColumn: '1 / -1' } : undefined} />
            ) : (
              <RF.Input key={f.name} label={f.required ? `${f.label} *` : f.label} icon={f.icon} type={f.type || 'text'} placeholder={f.placeholder} value={values[f.name]} onChange={(e) => set(f.name, e.target.value)} aria-label={f.label} />
            ),
          )}
        </div>

        {error && (
          <div role="alert" style={{ padding: '0 22px 4px', fontSize: '12.5px', color: 'var(--danger)' }}>{error}</div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', padding: '14px 22px', borderTop: '1px solid var(--border)', background: 'var(--surface-subtle)' }}>
          <div>
            {editing && onDelete && (
              <RF.Button variant="ghost" type="button" disabled={busy} onClick={remove} iconLeft={<RF.Icon name="trash" size={14} />} style={{ color: 'var(--danger)' }}>Löschen</RF.Button>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <RF.Button variant="ghost" type="button" disabled={busy} onClick={onClose}>Abbrechen</RF.Button>
            <RF.Button variant="primary" type="submit" disabled={busy}>{busy ? 'Speichere…' : editing ? form.editSubmitLabel : form.submitLabel}</RF.Button>
          </div>
        </div>
      </form>
    </>
  );
}

Object.assign(window, { RecordFormModal, RECORD_FORMS });
