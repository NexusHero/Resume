/* RecordFormModal — a real create form (replaces the window.prompt() flows) for
   mandates, talents and placements. Field configs live in RECORD_FORMS; the
   modal is generic and validates required fields before calling onSubmit. */
const RF = window.MyJobDesignSystem_f3658e;

const RECORD_FORMS = {
  mandate: {
    title: 'New mandate',
    subtitle: 'Open a client search mandate',
    editTitle: 'Edit mandate',
    editSubmitLabel: 'Save changes',
    icon: 'briefcase',
    submitLabel: 'Create mandate',
    fields: [
      { name: 'client', label: 'Client', icon: 'building', required: true },
      { name: 'role', label: 'Role', icon: 'briefcase', required: true },
      { name: 'location', label: 'Location', icon: 'pin', required: true },
      { name: 'fee', label: 'Fee', icon: 'trend', placeholder: 'e.g. 22%' },
      { name: 'feeValue', label: 'Fee value', placeholder: 'e.g. 17.160 €' },
      { name: 'deadline', label: 'Deadline', placeholder: 'YYYY-MM-DD' },
      { name: 'priority', label: 'Priority', type: 'select', options: ['high', 'medium', 'low'], default: 'medium' },
      { name: 'status', label: 'Status', type: 'select', options: ['active', 'paused', 'closed'], default: 'active' },
      { name: 'jobText', label: 'Job ad (Stellenanzeige)', type: 'textarea', full: true, rows: 5, placeholder: 'Paste the job posting — powers matching, ATS score, AGG check and candidate prep' },
    ],
  },
  talent: {
    title: 'Add talent',
    subtitle: 'Add a candidate to your pool',
    icon: 'user',
    submitLabel: 'Add talent',
    fields: [
      { name: 'name', label: 'Name', icon: 'user', required: true },
      { name: 'role', label: 'Role', icon: 'briefcase' },
      { name: 'headline', label: 'Headline' },
      { name: 'location', label: 'Location', icon: 'pin' },
      { name: 'email', label: 'Email', type: 'email' },
      { name: 'phone', label: 'Phone' },
      { name: 'availability', label: 'Availability', placeholder: 'e.g. immediately' },
      { name: 'salary', label: 'Salary expectation' },
      { name: 'skills', label: 'Skills', full: true, placeholder: 'Comma-separated, e.g. React, TypeScript — powers Matching' },
    ],
  },
  placement: {
    title: 'Add placement',
    subtitle: 'Record a booked placement',
    editTitle: 'Edit placement',
    editSubmitLabel: 'Save changes',
    icon: 'award',
    submitLabel: 'Add placement',
    fields: [
      { name: 'candidateName', label: 'Candidate', icon: 'user', required: true },
      { name: 'candidateRole', label: 'Role', icon: 'briefcase' },
      { name: 'client', label: 'Client', icon: 'building', required: true },
      { name: 'start', label: 'Start', placeholder: 'YYYY-MM-DD' },
      { name: 'fee', label: 'Fee', placeholder: 'e.g. 19.000 €' },
      { name: 'status', label: 'Status', type: 'select', options: ['probation', 'invoiced', 'paid'], default: 'probation' },
    ],
  },
};

function RecordFormModal({ kind, record, prefill, onClose, onSubmit }) {
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

  const set = (name, v) => setValues((s) => ({ ...s, [name]: v }));
  const missing = form.fields.filter((f) => f.required && !String(values[f.name]).trim());

  const submit = (e) => {
    e.preventDefault();
    if (missing.length) {
      setError(`Please fill in: ${missing.map((f) => f.label).join(', ')}`);
      return;
    }
    setBusy(true);
    setError('');
    Promise.resolve(onSubmit(values))
      .then(() => onClose())
      .catch(() => {
        setError('Could not save. Please try again.');
        setBusy(false);
      });
  };

  return (
    <>
      <div onClick={busy ? undefined : onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(8,11,18,0.45)', backdropFilter: 'blur(2px)', zIndex: 50, animation: 'fadeIn .2s ease' }} />
      <form onSubmit={submit} style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 51, width: 'min(640px, 94vw)', maxHeight: '90vh', display: 'flex', flexDirection: 'column', background: 'var(--surface-card)', borderRadius: 'var(--radius-xl)', boxShadow: 'var(--shadow-lg)', overflow: 'hidden', animation: 'popIn .24s cubic-bezier(0.16,1,0.3,1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '13px', padding: '18px 22px', borderBottom: '1px solid var(--border)' }}>
          <span style={{ width: '38px', height: '38px', borderRadius: 'var(--radius-md)', background: 'var(--accent)', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><RF.Icon name={form.icon} size={18} /></span>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '17px', fontWeight: 700, color: 'var(--text-heading)' }}>{editing ? form.editTitle : form.title}</div>
            <div style={{ fontSize: '12.5px', color: 'var(--text-soft)' }}>{form.subtitle}</div>
          </div>
          <RF.IconButton icon="x" label="Close" variant="ghost" type="button" onClick={onClose} />
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

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px', padding: '14px 22px', borderTop: '1px solid var(--border)', background: 'var(--surface-subtle)' }}>
          <RF.Button variant="ghost" type="button" disabled={busy} onClick={onClose}>Cancel</RF.Button>
          <RF.Button variant="primary" type="submit" disabled={busy}>{busy ? 'Saving…' : editing ? form.editSubmitLabel : form.submitLabel}</RF.Button>
        </div>
      </form>
    </>
  );
}

Object.assign(window, { RecordFormModal, RECORD_FORMS });
