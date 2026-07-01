/* myJob — candidate-centric data model.
   Core object = TALENT. "Me" (me) is talent #1; representing others is the
   Agency extension. Each talent owns a resume, attachments and applications. */

const STAGES_ORDER = ['new', 'review', 'interview', 'offer', 'hired'];
const STAGE_LABELS = { new: 'Submitted', review: 'In review', interview: 'Interview', offer: 'Offer', hired: 'Hired', rejected: 'Rejected' };

/* ---------- Anhänge (documents) — shared library per talent ---------- */
const ME_ATTACHMENTS = [
  { id: 'at1', name: 'Arbeitszeugnis — TRUMPF SE + Co. KG', tag: 'Zeugnis', sub: '2 Seiten · PDF', kind: 'zeugnis' },
  { id: 'at2', name: 'M.Sc. Zeugnis — Hochschule Furtwangen', tag: 'Zeugnis', sub: '1 Seite · PDF', kind: 'zeugnis' },
  { id: 'at3', name: 'ISAQB Foundation Level — Zertifikat', tag: 'Zertifikat', sub: '1 Seite · PDF', kind: 'zertifikat' },
  { id: 'at4', name: 'Clean Code C++17 — Zertifikat', tag: 'Zertifikat', sub: '1 Seite · PDF', kind: 'zertifikat' },
];

/* ---------- Lebenslauf for "Me" ---------- */
const ME_RESUME = {
  summary: 'Software Engineer (M.Sc.) mit über 7 Jahren Erfahrung in hardwarenaher, verteilter und sicherheitskritischer Softwareentwicklung (C++ und C#/.NET). Schwerpunkte: komplexe Systemarchitekturen, moderne DevOps-Praktiken (CI/CD) und agile Methoden.',
  experience: [
    { role: 'Software Engineer', company: 'Rheinmetall Air Defence AG', period: '11/2024 — heute', location: 'Zürich (CH)', bullets: ['Zentrale Steuersoftware der Oerlikon Skynex® für Control Nodes und Feuerleitgeräte entwickelt', 'Taktische Kommunikationsprotokolle (TCP, REST, Protobuf) zur Vernetzung von Sensoren, Effektoren und Simulationen implementiert', 'QML-Bedienoberflächen umgesetzt und Gitflow + CI/CD teamweit eingeführt'], skills: ['C++20', 'QML', 'Protobuf', 'REST'] },
    { role: 'Software Engineer C++ / C#', company: 'TRUMPF SE + Co. KG', period: '03/2019 — 10/2024', location: 'Schramberg (DE)', bullets: ['C++-Visionsystem weiterentwickelt; Kameraanbindung von 60 auf 280 FPS gesteigert', '.NET/gRPC Quality Data Store und CAD/CAM-Microservice (C#) gebaut', 'Scrum Master eines 5-köpfigen Teams; OPC-UA/gRPC-Integration entwickelt'], skills: ['C++17', 'C#', '.NET', 'gRPC', 'OPC-UA'] },
  ],
  education: [
    { degree: 'M.Sc. Informatik', school: 'Hochschule Furtwangen', period: '2017 — 2019', note: 'Schwerpunkt Software Engineering · Note 1.9' },
    { degree: 'B.Sc. Allgemeine Informatik', school: 'Hochschule Furtwangen', period: '2014 — 2017', note: 'Note 2.2' },
  ],
  skillGroups: [
    { label: 'Sprachen', items: ['C++20', 'C# / .NET', 'Python'] },
    { label: 'Protokolle & APIs', items: ['gRPC', 'Protobuf', 'OPC-UA', 'REST', 'MQTT'] },
    { label: 'Architektur & DevOps', items: ['Microservices', 'Clean Architecture', 'ISAQB', 'Docker', 'CI/CD'] },
  ],
};

/* ---------- Anschreiben for "Me" (default, pro Stelle anpassbar) ---------- */
const ME_LETTER = {
  firma: '[Unternehmensname]',
  ansprechpartner: '[Ansprechpartner / Personalabteilung]',
  strasse: '[Straße und Hausnummer]',
  plzOrt: '[PLZ Ort]',
  betreff: 'Bewerbung als [Stellenbezeichnung]',
  anrede: 'Sehr geehrte Damen und Herren,',
  absaetze: [
    'mit großem Interesse habe ich Ihre Ausschreibung gelesen. Als Software Engineer (M.Sc.) mit über 7 Jahren Erfahrung in C++ und C#/.NET bringe ich genau das technische Profil mit, das Sie suchen.',
    'Aktuell entwickle ich bei der Rheinmetall Air Defence AG in Zürich Steuersoftware für das Oerlikon Skynex®-System — inkl. taktischer Kommunikationsprotokolle und QML-Oberflächen. Zuvor habe ich bei TRUMPF über fünf Jahre Visionsysteme, Microservices und CI/CD-Pipelines maßgeblich gestaltet.',
    'Gerne überzeuge ich Sie in einem persönlichen Gespräch, wie ich mit moderner C++-Entwicklung, Systemarchitektur und DevOps einen Beitrag leisten kann.',
  ],
  gruss: 'Mit freundlichen Grüßen',
};

/* ---------- Talents (the pool) — "me" pinned first ---------- */
const TALENTS = [
  {
    id: 'me', me: true, name: 'Suhay Sevinc', role: 'M.Sc. Software Engineer', headline: 'Senior C++ / C# · Echtzeit- & verteilte Systeme',
    src: '../../assets/img/candidate-portrait-sm.jpg', location: 'Blumberg, DE', email: 'suhay.sevinc@gmail.com', phone: '+49 176 91407840',
    linkedin: 'linkedin.com/in/suhay-sevinc', availability: 'sofort', salary: 'CHF 120–140k', score: 88,
    skills: ['C++20', 'C# / .NET', 'Qt / QML', 'Microservices', 'gRPC'],
    resume: ME_RESUME, letter: ME_LETTER, attachments: ME_ATTACHMENTS,
  },
  { id: 't2', name: 'Lena Brandt', role: 'Product Designer', headline: 'B2B-SaaS · Design Systems', location: 'Leipzig', email: 'lena.brandt@example.de', phone: '+49 160 1112 2334', availability: 'in 6 weeks', salary: '64.000 €', score: 81, skills: ['Figma', 'Design Systems', 'Prototyping'], attachments: [] },
  { id: 't3', name: 'Marco Adler', role: 'DevOps Engineer', headline: 'Cloud · Automation', location: 'Munich', email: 'marco.adler@example.de', phone: '+49 170 5566 7788', availability: 'immediately', salary: '72.000 €', score: 74, skills: ['Terraform', 'AWS', 'CI/CD', 'Go'], attachments: [] },
  { id: 't4', name: 'Aylin Demir', role: 'UX Researcher', headline: 'Qualitative Research', location: 'Berlin', email: 'aylin.demir@example.de', phone: '+49 151 4433 2211', availability: 'in 2 months', salary: '66.000 €', score: 84, skills: ['User Research', 'Interviews', 'Figma'], attachments: [] },
];

/* ---------- Bewerbungen (applications) — belong to a talent ---------- */
const APPLICATIONS = [
  { id: 'b1', talentId: 'me', company: 'Aurora Systems GmbH', role: 'Senior C++ Engineer', location: 'Berlin · Hybrid', status: 'interview', date: '12.06.2026', next: 'Tech interview · 24.06.', score: 88, attachments: ['at1', 'at3'], anschreiben: true },
  { id: 'b2', talentId: 'me', company: 'Meridian Labs', role: 'Distributed Systems Eng.', location: 'Remote', status: 'review', date: '09.06.2026', next: 'In review', score: 84, attachments: ['at1', 'at2'], anschreiben: true },
  { id: 'b3', talentId: 'me', company: 'Falk & Partner', role: 'Platform Engineer', location: 'Munich', status: 'offer', date: '05.06.2026', next: 'Offer — due 28.06.', score: 90, attachments: ['at1', 'at2', 'at4'], anschreiben: true },
  { id: 'b4', talentId: 'me', company: 'Hansa Digital', role: 'C++ Tech Lead', location: 'Bremen', status: 'rejected', date: '28.05.2026', next: 'Unfortunately rejected', score: 70, attachments: ['at1'], anschreiben: true },
  { id: 'b5', talentId: 'me', company: 'Nordlicht Software', role: 'Backend Engineer', location: 'Hamburg', status: 'new', date: '02.06.2026', next: 'Submitted', score: 80, attachments: ['at1', 'at3'], anschreiben: false },
  { id: 'b6', talentId: 't2', company: 'Aurora Systems GmbH', role: 'Product Designer', location: 'Berlin', status: 'interview', date: '10.06.2026', next: 'Portfolio call · 26.06.', score: 81, attachments: [], anschreiben: true },
  { id: 'b7', talentId: 't3', company: 'Meridian Labs', role: 'DevOps Engineer', location: 'Remote', status: 'new', date: 'today', next: 'Submitted', score: 74, attachments: [], anschreiben: false },
  { id: 'b8', talentId: 't4', company: 'Nordlicht Software', role: 'UX Researcher', location: 'Hamburg', status: 'offer', date: '04.06.2026', next: 'Offer received', score: 84, attachments: [], anschreiben: true },
  { id: 'b9', talentId: 't2', company: 'Falk & Partner', role: 'Brand Designer', location: 'Munich', status: 'review', date: '07.06.2026', next: 'In review', score: 78, attachments: [], anschreiben: true },
];

/* ---------- Stellen (saved open positions) ---------- */
const JOBS = [
  { id: 'j1', title: 'Senior C++ Engineer', company: 'Aurora Systems GmbH', location: 'Berlin · Hybrid', type: 'Full-time', salary: '75–90 T€', match: 92, saved: true },
  { id: 'j2', title: 'Distributed Systems Eng.', company: 'Meridian Labs', location: 'Remote (DE)', type: 'Full-time', salary: '80–95 T€', match: 86, saved: true },
  { id: 'j3', title: 'Backend Engineer (Rust)', company: 'Hojo Tech', location: 'Berlin', type: 'Full-time', salary: '70–85 T€', match: 79, saved: false },
  { id: 'j4', title: 'Platform Engineer', company: 'Falk & Partner', location: 'Munich', type: 'Full-time', salary: '72–88 T€', match: 83, saved: true },
];

const MESSAGES = [
  { id: 'm1', appId: 'b1', from: 'Aurora Systems · Recruiting', text: 'We would be glad to invite you to the tech interview on June 24 at 14:00.', when: '2 hrs ago', unread: true },
  { id: 'm2', appId: 'b3', from: 'Falk & Partner · HR', text: 'Please find our offer attached. We would appreciate a reply by June 28.', when: '5 hrs ago', unread: true },
  { id: 'm3', appId: 'b8', from: 'Nordlicht Software', text: 'The offer for Aylin Demir has gone out — details attached.', when: 'yesterday', unread: false },
  { id: 'm4', appId: 'b2', from: 'Meridian Labs', text: 'Thank you for the documents, we will be in touch this week.', when: '2 days ago', unread: false },
];

const KPIS = [
  { label: 'Active applications', value: '7', delta: '+2', dir: 'up', icon: 'send' },
  { label: 'Im Interview', value: '2', delta: '+1', dir: 'up', icon: 'message' },
  { label: 'Angebote', value: '2', delta: '+1', dir: 'up', icon: 'award' },
  { label: 'Antwortquote', value: '63%', delta: '+5%', dir: 'up', icon: 'trend' },
];

/* ===== Vermittler-Seite (du betreibst die Vermittlung selbst) =====
   Clients → Mandates (search assignments with fee) → Placements. */
const CLIENTS = [
  { id: 'k1', name: 'Aurora Systems GmbH', industry: 'SaaS · Plattform', location: 'Berlin', since: '2024' },
  { id: 'k2', name: 'Nordlicht Software', industry: 'Fintech', location: 'Hamburg', since: '2025' },
  { id: 'k3', name: 'Falk & Partner', industry: 'Consulting', location: 'Munich', since: '2023' },
  { id: 'k4', name: 'Meridian Labs', industry: 'KI · Research', location: 'Remote', since: '2026' },
];

const MANDATES = [
  { id: 'ma1', clientId: 'k1', role: 'Senior C++ Engineer', location: 'Berlin · Hybrid', fee: '22%', feeValue: '17.160 €', deadline: '30.06.2026', priority: 'high', submitted: 4, interviews: 2, status: 'active' },
  { id: 'ma2', clientId: 'k1', role: 'DevOps Engineer', location: 'Berlin', fee: '20%', feeValue: '14.000 €', deadline: '15.07.2026', priority: 'medium', submitted: 2, interviews: 1, status: 'active' },
  { id: 'ma3', clientId: 'k2', role: 'Backend Engineer', location: 'Hamburg', fee: '22%', feeValue: '16.500 €', deadline: '10.07.2026', priority: 'high', submitted: 3, interviews: 1, status: 'active' },
  { id: 'ma4', clientId: 'k3', role: 'Platform Engineer', location: 'Munich', fee: '18%', feeValue: '12.200 €', deadline: '05.07.2026', priority: 'low', submitted: 1, interviews: 0, status: 'paused' },
  { id: 'ma5', clientId: 'k4', role: 'Distributed Systems Eng.', location: 'Remote', fee: '24%', feeValue: '19.800 €', deadline: '20.07.2026', priority: 'medium', submitted: 2, interviews: 1, status: 'active' },
];

const PLACEMENTS = [
  { id: 'pl1', candName: 'Mara Vogel', candRole: 'Engineering Manager', client: 'Aurora Systems GmbH', start: '01.07.2026', fee: '19.000 €', status: 'Invoiced' },
  { id: 'pl2', candName: 'Lena Brandt', candRole: 'Brand Designer', client: 'Nordlicht Software', start: '15.06.2026', fee: '12.600 €', status: 'Paid' },
  { id: 'pl3', candName: 'Aylin Demir', candRole: 'UX Researcher', client: 'Meridian Labs', start: '01.08.2026', fee: '17.000 €', status: 'Probation' },
];

const VERMITTLER_KPIS = [
  { label: 'Active mandates', value: '5', delta: '+2', dir: 'up', icon: 'briefcase' },
  { label: 'Talents in pool', value: '4', delta: '+1', dir: 'up', icon: 'users' },
  { label: 'Placements Q2', value: '7', delta: '+3', dir: 'up', icon: 'award' },
  { label: 'Fees Q2', value: '128 T€', delta: '+18%', dir: 'up', icon: 'trend' },
];

/* ============================================================
   Live backend wiring. The recruiting views read from the REST API
   (server/src) instead of the sample data above. Base URL is same-origin
   when served by the app server; override via window.RECRUIT_API.
   The sample arrays above stay as an offline fallback (e.g. file://).
   ============================================================ */
const RECRUIT_API_BASE = (typeof window !== 'undefined' && window.RECRUIT_API) || '/api/v1';

const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

async function _jsonOrThrow(res) {
  if (!res.ok) throw new Error(`API ${res.status}`);
  return res.json();
}

/* Backend Placement → the shape PlatzierungenView/ReportsView render. */
function mapPlacement(p) {
  return {
    id: p.id,
    candName: p.candidateName,
    candRole: p.candidateRole,
    client: p.client,
    start: p.start,
    fee: p.fee,
    status: cap(p.status),
  };
}

/* A sample (or UI) placement → the POST body the API expects. */
function toPlacementCreate(p) {
  return {
    candidateName: p.candName || p.candidateName || '',
    candidateRole: p.candRole || p.candidateRole || '',
    client: p.client || '',
    start: p.start || '',
    fee: p.fee || '',
    status: (p.status || 'probation').toLowerCase(),
  };
}

/* Backend Talent → the shape TalentGrid/TalentProfile render. Dossier fields
   (resume, attachments, letter) are absent on purpose: TalentProfile shows its
   empty states for API talents, while the rich "me" talent stays the sample
   object (its dossier is edited via the document editor — a separate concern). */
function mapTalent(t) {
  const filled =
    [t.role, t.headline, t.location, t.email, t.phone, t.availability, t.salary].filter(Boolean)
      .length + (Array.isArray(t.skills) && t.skills.length ? 1 : 0);
  return {
    id: t.id,
    name: t.name,
    role: t.role || '',
    headline: t.headline || '',
    location: t.location || '',
    email: t.email || '',
    phone: t.phone || '',
    availability: t.availability || '',
    salary: t.salary || '',
    skills: Array.isArray(t.skills) ? t.skills : [],
    score: typeof t.score === 'number' ? t.score : Math.round((filled / 8) * 100),
    attachments: [],
    me: false,
  };
}

/* A UI talent → the POST body the API expects. */
function toTalentCreate(t) {
  return {
    name: t.name || '',
    role: t.role || '',
    headline: t.headline || '',
    location: t.location || '',
    email: t.email || '',
    phone: t.phone || '',
    availability: t.availability || '',
    salary: t.salary || '',
    skills: Array.isArray(t.skills) ? t.skills : [],
  };
}

/* Backend Mandate → the shape MandateView renders (client is already a name). */
function mapMandate(m) {
  return {
    id: m.id,
    client: m.client,
    role: m.role,
    location: m.location,
    fee: m.fee,
    feeValue: m.feeValue,
    deadline: m.deadline,
    priority: m.priority,
    status: m.status,
    submitted: m.submitted,
    interviews: m.interviews,
  };
}

/* A UI mandate → the POST body the API expects. */
function toMandateCreate(m) {
  return {
    client: m.client || '',
    role: m.role || '',
    location: m.location || '',
    fee: m.fee || '',
    feeValue: m.feeValue || '',
    deadline: m.deadline || '',
    priority: m.priority || 'medium',
    status: m.status || 'active',
    submitted: m.submitted || 0,
    interviews: m.interviews || 0,
  };
}

/* The sample mandates with their client id resolved to a name — the offline
   fallback shape that MandateView (which groups by client name) expects. */
const SAMPLE_MANDATES = MANDATES.map((m) => ({
  ...m,
  client: (CLIENTS.find((c) => c.id === m.clientId) || {}).name || '—',
}));

const RecruitApi = {
  /* ---- Auth ---- */
  async authMe() {
    const data = await _jsonOrThrow(await fetch(`${RECRUIT_API_BASE}/auth/me`));
    return data.user; // null when not signed in
  },
  async authProviders() {
    try {
      return await _jsonOrThrow(await fetch(`${RECRUIT_API_BASE}/auth/providers`));
    } catch {
      return { google: false, linkedin: false };
    }
  },
  async authLogin(email, password) {
    const res = await fetch(`${RECRUIT_API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).detail || 'Login failed');
    return (await res.json()).user;
  },
  async authRegister(email, password) {
    const res = await fetch(`${RECRUIT_API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok)
      throw new Error((await res.json().catch(() => ({}))).detail || 'Could not create account');
    return (await res.json()).user;
  },
  async authLogout() {
    await fetch(`${RECRUIT_API_BASE}/auth/logout`, { method: 'POST' });
  },
  async requestPasswordReset(email) {
    // Always resolves (the server replies 202 whether or not the email exists).
    await fetch(`${RECRUIT_API_BASE}/auth/password-reset/request`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email }),
    });
  },
  async confirmPasswordReset(token, password) {
    const res = await fetch(`${RECRUIT_API_BASE}/auth/password-reset/confirm`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ token, password }),
    });
    if (!res.ok)
      throw new Error(
        (await res.json().catch(() => ({}))).detail || 'This reset link is invalid or has expired',
      );
  },
  /* ---- Account (DSGVO) ---- */
  async exportAccount() {
    // The full owner-scoped payload (account + mandates/talents/placements).
    return _jsonOrThrow(await fetch(`${RECRUIT_API_BASE}/account/export`));
  },
  async deleteAccount() {
    const res = await fetch(`${RECRUIT_API_BASE}/account`, { method: 'DELETE' });
    if (!res.ok) throw new Error(`API ${res.status}`);
  },
  /* ---- LLM settings (active provider + availability) ---- */
  async getLlmSettings() {
    return _jsonOrThrow(await fetch(`${RECRUIT_API_BASE}/settings/llm`));
  },
  async setLlmProvider(provider) {
    return _jsonOrThrow(
      await fetch(`${RECRUIT_API_BASE}/settings/llm`, {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ provider }),
      }),
    );
  },
  /* ---- Per-user API keys (stored encrypted server-side) ---- */
  async getApiKeyStatus() {
    // { claude: boolean, gemini: boolean } — never the keys themselves.
    return _jsonOrThrow(await fetch(`${RECRUIT_API_BASE}/settings/keys`));
  },
  async setApiKey(provider, key) {
    const res = await fetch(`${RECRUIT_API_BASE}/settings/keys/${provider}`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ key }),
    });
    if (!res.ok) throw new Error(`API ${res.status}`);
  },
  async removeApiKey(provider) {
    const res = await fetch(`${RECRUIT_API_BASE}/settings/keys/${provider}`, { method: 'DELETE' });
    if (!res.ok) throw new Error(`API ${res.status}`);
  },
  async listMandates() {
    const data = await _jsonOrThrow(await fetch(`${RECRUIT_API_BASE}/mandates`));
    return Array.isArray(data) ? data.map(mapMandate) : [];
  },
  async createMandate(input) {
    const data = await _jsonOrThrow(
      await fetch(`${RECRUIT_API_BASE}/mandates`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(toMandateCreate(input)),
      }),
    );
    return mapMandate(data.mandate);
  },
  async updateMandate(id, input) {
    const data = await _jsonOrThrow(
      await fetch(`${RECRUIT_API_BASE}/mandates/${id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(toMandateCreate(input)),
      }),
    );
    return mapMandate(data.mandate);
  },
  async listTalents() {
    const data = await _jsonOrThrow(await fetch(`${RECRUIT_API_BASE}/talents`));
    return Array.isArray(data) ? data.map(mapTalent) : [];
  },
  async createTalent(input) {
    const data = await _jsonOrThrow(
      await fetch(`${RECRUIT_API_BASE}/talents`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(toTalentCreate(input)),
      }),
    );
    return mapTalent(data.talent);
  },
  /* ---- Talent documents (resume + cover letter, stored server-side) ---- */
  async getTalentDocuments(talentId) {
    const data = await _jsonOrThrow(
      await fetch(`${RECRUIT_API_BASE}/talents/${talentId}/documents`),
    );
    return data.documents; // { contact, resume, letter, style, updatedAt }
  },
  async saveTalentDocuments(talentId, documents) {
    const data = await _jsonOrThrow(
      await fetch(`${RECRUIT_API_BASE}/talents/${talentId}/documents`, {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(documents),
      }),
    );
    return data.documents;
  },
  talentDocumentsPdfUrl(talentId) {
    // Same-origin GET — the session cookie authorises it, so it can be opened
    // directly in a new tab / used as a download link.
    return `${RECRUIT_API_BASE}/talents/${talentId}/documents/pdf`;
  },
  talentDossierPdfUrl(talentId, recipient = {}) {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(recipient)) if (v) q.set(k, v);
    const qs = q.toString();
    return `${RECRUIT_API_BASE}/talents/${talentId}/dossier/pdf${qs ? `?${qs}` : ''}`;
  },
  /* ---- Attachments (files stored server-side per talent) ---- */
  async listAttachments(talentId) {
    const data = await _jsonOrThrow(
      await fetch(`${RECRUIT_API_BASE}/talents/${talentId}/attachments`),
    );
    return Array.isArray(data) ? data : [];
  },
  async uploadAttachment(talentId, { name, contentType, dataBase64 }) {
    const data = await _jsonOrThrow(
      await fetch(`${RECRUIT_API_BASE}/talents/${talentId}/attachments`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name, contentType, dataBase64 }),
      }),
    );
    return data.attachment;
  },
  async deleteAttachment(attachmentId) {
    const res = await fetch(`${RECRUIT_API_BASE}/attachments/${attachmentId}`, { method: 'DELETE' });
    if (!res.ok) throw new Error(`API ${res.status}`);
  },
  async suggestDocument(talentId, action, target = {}) {
    const data = await _jsonOrThrow(
      await fetch(`${RECRUIT_API_BASE}/talents/${talentId}/documents/ai`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action, ...target }),
      }),
    );
    return data.suggestion; // { action, text?, paragraphs?, provider }
  },
  async parseDocument(talentId, text) {
    const data = await _jsonOrThrow(
      await fetch(`${RECRUIT_API_BASE}/talents/${talentId}/documents/parse`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ text }),
      }),
    );
    return data.parsed; // { contact, resume, provider }
  },
  async atsScore(talentId, jobText) {
    const data = await _jsonOrThrow(
      await fetch(`${RECRUIT_API_BASE}/talents/${talentId}/documents/ats`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ jobText }),
      }),
    );
    return data.ats; // { score, matched, missing, suggestions, provider }
  },
  async pitchCandidate(talentId, mandateContext = '') {
    const data = await _jsonOrThrow(
      await fetch(`${RECRUIT_API_BASE}/talents/${talentId}/documents/pitch`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ mandateContext }),
      }),
    );
    return data.pitch; // { headline, paragraphs, highlights, provider }
  },
  async listPlacements() {
    const data = await _jsonOrThrow(await fetch(`${RECRUIT_API_BASE}/placements`));
    return Array.isArray(data) ? data.map(mapPlacement) : [];
  },
  async createPlacement(input) {
    const data = await _jsonOrThrow(
      await fetch(`${RECRUIT_API_BASE}/placements`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(toPlacementCreate(input)),
      }),
    );
    return mapPlacement(data.placement);
  },
  async updatePlacement(id, input) {
    const data = await _jsonOrThrow(
      await fetch(`${RECRUIT_API_BASE}/placements/${id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(toPlacementCreate(input)),
      }),
    );
    return mapPlacement(data.placement);
  },
};

/* ---------- Live aggregates ----------
   The Übersicht (Dashboard) and Berichte (Reports) read from the same live
   mandates/talents/placements the other views do, so their KPIs and the
   fee-per-client breakdown reflect the signed-in recruiter's own data rather
   than the static sample. All helpers are pure so they degrade gracefully to
   the offline samples when the API is unreachable. */

/** "19.000 €" / "24%" → 19000 / 24 (digits only; German thousands dot dropped). */
function parseFeeAmount(s) {
  return parseInt(String(s == null ? '' : s).replace(/[^0-9]/g, ''), 10) || 0;
}

/** Sum of placement fees, formatted compactly: 128450 → "128 T€", 540 → "540 €". */
function formatFeeSum(sum) {
  return sum >= 1000 ? `${Math.round(sum / 1000)} T€` : `${sum} €`;
}

/** Recruiter KPIs derived from the live data (no deltas — there's no baseline). */
function computeVermittlerKpis(mandates, talents, placements) {
  const ms = mandates || [];
  const ts = talents || [];
  const ps = placements || [];
  const active = ms.filter((m) => m.status === 'active').length;
  const fees = ps.reduce((a, p) => a + parseFeeAmount(p.fee), 0);
  return [
    { label: 'Active mandates', value: String(active), icon: 'briefcase' },
    { label: 'Talents in pool', value: String(ts.length), icon: 'users' },
    { label: 'Placements', value: String(ps.length), icon: 'award' },
    { label: 'Fees', value: formatFeeSum(fees), icon: 'trend' },
  ];
}

/** The client universe for Reports: every client named by a live mandate or
    placement, so fees-per-client covers API clients absent from the sample. */
function deriveReportClients(mandates, placements) {
  const names = [];
  const seen = new Set();
  [...(mandates || []), ...(placements || [])].forEach((row) => {
    const name = row && row.client;
    if (name && !seen.has(name)) {
      seen.add(name);
      names.push({ name });
    }
  });
  return names;
}

Object.assign(window, { STAGES_ORDER, STAGE_LABELS, TALENTS, APPLICATIONS, JOBS, MESSAGES, KPIS, CLIENTS, MANDATES, PLACEMENTS, VERMITTLER_KPIS, SAMPLE_MANDATES, RecruitApi, parseFeeAmount, formatFeeSum, computeVermittlerKpis, deriveReportClients });
