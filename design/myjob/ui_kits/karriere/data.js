/* ============================================================
   myJob · Karriere — personal sample data.
   Everything is the logged-in user's own: applications they SENT
   (so they stop forgetting), and the positions they've WORKED,
   with earnings. Registers on window for the babel scripts.
   ============================================================ */
(function () {

const ME = {
  name: 'Suhay Sevinc',
  role: 'M.Sc. Software Engineer',
  headline: 'C++ · Rust · Distributed Systems',
  location: 'Berlin',
  src: '../../assets/img/candidate-portrait-sm.jpg',
  email: 'suhay.sevinc@example.de',
  /* Skills the candidate already has — used to match jobs and to flag which
     new skills a lower-matching ("stretch") job would add. */
  skills: ['C++', 'Rust', 'Distributed Systems', 'gRPC', 'Kubernetes', 'Go', 'AWS', 'PostgreSQL', 'Microservices', 'Remote'],
};

/* short codes shown as chips on each application */
const DOC = { cv: 'Résumé', anschreiben: 'Cover letter', mappe: 'Bundle', zeugnisse: 'References', portfolio: 'Portfolio' };

/* a brand tile color per company (no real logos) */
const APPLICATIONS = [
  {
    id: 'a1', company: 'Celonis', tile: '#6366f1', role: 'Senior C++ Engineer', location: 'Munich · hybrid',
    sent: '2026-06-18', channel: 'Job board', via: 'myJob', status: 'interview', statusLabel: 'Interview',
    docs: ['cv', 'anschreiben', 'mappe'], salaryAsked: '€88,000',
    lastReply: '2026-06-22', awaiting: false, nextStep: 'Tech interview · June 30, 2:00 PM',
    recruiter: { name: 'Jana Pohl', role: 'Tech Recruiter' },
    notes: 'Second interview scheduled. Prepare for system design (gRPC, sharding).',
    timeline: [
      { date: '2026-06-18', label: 'Application sent', kind: 'sent' },
      { date: '2026-06-19', label: 'Receipt confirmed', kind: 'ack' },
      { date: '2026-06-22', label: 'Interview invitation', kind: 'interview' },
    ],
  },
  {
    id: 'a2', company: 'Trade Republic', tile: '#0f172a', role: 'Backend Engineer (Rust)', location: 'Berlin · remote',
    sent: '2026-06-11', channel: 'Website', via: 'direct', status: 'review', statusLabel: 'In review',
    docs: ['cv', 'anschreiben'], salaryAsked: '€85,000',
    lastReply: '2026-06-12', awaiting: true, nextStep: null,
    recruiter: { name: 'Talent Team', role: 'People' },
    notes: 'Receipt confirmed, quiet since. Follow up on June 27.',
    timeline: [
      { date: '2026-06-11', label: 'Application sent', kind: 'sent' },
      { date: '2026-06-12', label: 'Receipt confirmed', kind: 'ack' },
    ],
  },
  {
    id: 'a3', company: 'N26', tile: '#1f8a5b', role: 'Platform Engineer', location: 'Berlin · hybrid',
    sent: '2026-06-02', channel: 'LinkedIn', via: 'Referral', status: 'offer', statusLabel: 'Offer',
    docs: ['cv', 'anschreiben', 'mappe', 'zeugnisse'], salaryAsked: '€90,000',
    lastReply: '2026-06-20', awaiting: false, nextStep: 'Review offer · deadline June 30',
    recruiter: { name: 'Marco Reus', role: 'Hiring Manager' },
    notes: 'Offer €92,000 + 10% bonus. Weigh against Celonis.',
    timeline: [
      { date: '2026-06-02', label: 'Application sent', kind: 'sent' },
      { date: '2026-06-04', label: 'Receipt confirmed', kind: 'ack' },
      { date: '2026-06-09', label: 'Screening call', kind: 'interview' },
      { date: '2026-06-16', label: 'Onsite (3 rounds)', kind: 'interview' },
      { date: '2026-06-20', label: 'Offer received', kind: 'offer' },
    ],
  },
  {
    id: 'a4', company: 'Personio', tile: '#0a5dff', role: 'Software Engineer · Backend', location: 'Munich · hybrid',
    sent: '2026-05-28', channel: 'Job board', via: 'myJob', status: 'rejected', statusLabel: 'Rejected',
    docs: ['cv', 'anschreiben'], salaryAsked: '€82,000',
    lastReply: '2026-06-10', awaiting: false, nextStep: null,
    recruiter: { name: 'Recruiting', role: 'People' },
    notes: 'Rejected after screening — profile too infra-heavy. Feedback was fair.',
    timeline: [
      { date: '2026-05-28', label: 'Application sent', kind: 'sent' },
      { date: '2026-05-30', label: 'Receipt confirmed', kind: 'ack' },
      { date: '2026-06-10', label: 'Rejection', kind: 'rejected' },
    ],
  },
  {
    id: 'a5', company: 'SAP', tile: '#0a6ed1', role: 'Cloud Engineer', location: 'Walldorf · hybrid',
    sent: '2026-05-20', channel: 'Website', via: 'direct', status: 'review', statusLabel: 'In review',
    docs: ['cv', 'anschreiben', 'zeugnisse'], salaryAsked: '€80,000',
    lastReply: null, awaiting: true, nextStep: null,
    recruiter: null,
    notes: 'No confirmation received — receipt unclear. Follow up urgently.',
    timeline: [
      { date: '2026-05-20', label: 'Application sent', kind: 'sent' },
    ],
  },
  {
    id: 'a6', company: 'Zalando', tile: '#ff6900', role: 'Senior Software Engineer', location: 'Berlin · remote',
    sent: '2026-05-09', channel: 'LinkedIn', via: 'myJob', status: 'interview', statusLabel: 'Interview',
    docs: ['cv', 'anschreiben', 'portfolio'], salaryAsked: '€86,000',
    lastReply: '2026-05-26', awaiting: true, nextStep: 'Awaiting feedback after round 2',
    recruiter: { name: 'Lea Sommer', role: 'Tech Recruiter' },
    notes: 'Two rounds went well. No reply since May 26 — follow up.',
    timeline: [
      { date: '2026-05-09', label: 'Application sent', kind: 'sent' },
      { date: '2026-05-12', label: 'Receipt confirmed', kind: 'ack' },
      { date: '2026-05-19', label: '1st interview', kind: 'interview' },
      { date: '2026-05-26', label: '2nd interview', kind: 'interview' },
    ],
  },
  {
    id: 'a7', company: 'Check24', tile: '#005ea8', role: 'Backend Developer', location: 'Munich · on-site',
    sent: '2026-04-30', channel: 'Job board', via: 'direct', status: 'rejected', statusLabel: 'Rejected',
    docs: ['cv', 'anschreiben'], salaryAsked: '€78,000',
    lastReply: '2026-05-14', awaiting: false, nextStep: null,
    recruiter: null,
    notes: 'Rejected. The on-site requirement was a deal-breaker anyway.',
    timeline: [
      { date: '2026-04-30', label: 'Application sent', kind: 'sent' },
      { date: '2026-05-14', label: 'Rejection', kind: 'rejected' },
    ],
  },
];

/* ---- Work history with earnings. Two comp models:
        'salary'  → monthly gross (with raises) → total paid to date
        'hourly'  → rate × hours logged per month                       ---- */
const POSITIONS = [
  {
    id: 'p1', company: 'Aleph Systems', tile: '#2563eb', role: 'Senior Software Engineer',
    type: 'Full-time', location: 'Berlin · hybrid', current: true,
    start: '2024-03', end: null, model: 'salary',
    // monthly gross in € — a raise mid-2025
    salary: [
      { from: '2024-03', gross: 6500 },
      { from: '2025-07', gross: 7100 },
    ],
    bonusPaid: 8200, // cumulative bonus to date
  },
  {
    id: 'p2', company: 'Voltaic Labs', tile: '#7c3aed', role: 'Backend Engineer',
    type: 'Full-time', location: 'Munich · on-site', current: false,
    start: '2021-09', end: '2024-02', model: 'salary',
    salary: [
      { from: '2021-09', gross: 5200 },
      { from: '2023-01', gross: 5700 },
    ],
    bonusPaid: 5400,
  },
  {
    id: 'p3', company: 'TU Berlin · Distributed Systems Chair', tile: '#1f8a5b', role: 'Research Assistant (Working Student)',
    type: 'Working student', location: 'Berlin', current: false,
    start: '2020-04', end: '2021-08', model: 'hourly',
    rate: 17.5, // €/h
    hours: [ // hours logged per month (sampled)
      { month: '2020 Q2', h: 220 }, { month: '2020 Q3', h: 240 },
      { month: '2020 Q4', h: 250 }, { month: '2021 Q1', h: 245 },
      { month: '2021 Q2', h: 230 },
    ],
  },
  {
    id: 'p4', company: 'Freelance · various', tile: '#c2410c', role: 'Freelance Developer',
    type: 'Freelance', location: 'remote', current: true,
    start: '2023-01', end: null, model: 'hourly',
    rate: 75, // €/h
    hours: [
      { month: '2023', h: 180 }, { month: '2024', h: 320 }, { month: '2025', h: 410 },
      { month: '2026 YTD', h: 160 },
    ],
  },
];

const fmtEUR = (n) => '€\u00a0' + Math.round(n).toLocaleString('de-DE');

/* total paid to date per position */
function positionTotal(p) {
  if (p.model === 'hourly') {
    const h = p.hours.reduce((s, x) => s + x.h, 0);
    return { total: h * p.rate, hours: h };
  }
  // salary: sum gross across months each tier was active until end (or now)
  const now = new Date('2026-06-01');
  const end = p.end ? new Date(p.end + '-01') : now;
  let total = 0;
  for (let i = 0; i < p.salary.length; i++) {
    const tierStart = new Date(p.salary[i].from + '-01');
    const tierEnd = i + 1 < p.salary.length ? new Date(p.salary[i + 1].from + '-01') : end;
    const months = Math.max(0, (tierEnd.getFullYear() - tierStart.getFullYear()) * 12 + (tierEnd.getMonth() - tierStart.getMonth()));
    total += months * p.salary[i].gross;
  }
  total += p.bonusPaid || 0;
  return { total };
}

/* ---- Job search results (Jobsuche). Searchable by Land / Stadt / Suchbegriff ---- */
const JOBS = [
  { id: 'j1', company: 'Celonis', tile: '#6366f1', role: 'Senior C++ Engineer', city: 'München', country: 'Germany', mode: 'hybrid', salary: '85.000 – 98.000 €', posted: 'vor 2 Tagen', match: 94, tags: ['C++', 'gRPC', 'Distributed Systems'], snippet: 'Core business logic of the process-mining engine in modern C++20.' },
  { id: 'j2', company: 'GitLab', tile: '#fc6d26', role: 'Backend Engineer (Rust)', city: 'Remote', country: 'Remote · EU', mode: 'remote', salary: '80.000 – 95.000 €', posted: 'vor 4 Tagen', match: 90, tags: ['Rust', 'PostgreSQL', 'Remote'], snippet: 'Fully remote, async culture, open-source codebase.' },
  { id: 'j3', company: 'Bitpanda', tile: '#1d4ed8', role: 'Platform Engineer', city: 'Wien', country: 'Austria', mode: 'hybrid', salary: '70.000 – 88.000 €', posted: 'vor 1 Tag', match: 86, tags: ['Kubernetes', 'Go', 'AWS'], snippet: 'Scaling the trading platform for millions of users.' },
  { id: 'j4', company: 'Zalando', tile: '#ff6900', role: 'Senior Software Engineer', city: 'Berlin', country: 'Germany', mode: 'remote', salary: '82.000 – 96.000 €', posted: 'vor 6 Tagen', match: 88, tags: ['Scala', 'Kafka', 'Microservices'], snippet: 'Event-getriebene Services im Fashion-Commerce-Backend.' },
  { id: 'j5', company: 'Frequenz', tile: '#1f8a5b', role: 'Distributed Systems Engineer', city: 'Berlin', country: 'Germany', mode: 'hybrid', salary: '78.000 – 92.000 €', posted: 'vor 3 Tagen', match: 91, tags: ['Rust', 'gRPC', 'Energy'], snippet: 'Echtzeit-Steuerung dezentraler Energienetze.' },
  { id: 'j6', company: 'Proton', tile: '#6d4aff', role: 'C++ Software Engineer', city: 'Zürich', country: 'Switzerland', mode: 'vor Ort', salary: 'CHF 120k – 140k', posted: 'vor 5 Tagen', match: 83, tags: ['C++', 'Cryptography', 'Privacy'], snippet: 'Secure, open-source products for millions of users.' },
  { id: 'j7', company: 'N26', tile: '#1f8a5b', role: 'Backend Engineer', city: 'Berlin', country: 'Germany', mode: 'hybrid', salary: '75.000 – 90.000 €', posted: 'vor 8 Tagen', match: 87, tags: ['Java', 'Spring', 'Fintech'], snippet: 'Bezahl- und Konto-Services der mobilen Bank.' },
  { id: 'j8', company: 'Dynatrace', tile: '#1496ff', role: 'Senior Backend Engineer', city: 'Linz', country: 'Austria', mode: 'hybrid', salary: '72.000 – 89.000 €', posted: 'vor 2 Tagen', match: 80, tags: ['Java', 'Observability', 'Cloud'], snippet: 'Observability platform for large cloud environments.' },
  { id: 'j9', company: 'Siemens', tile: '#009999', role: 'Cloud Software Engineer', city: 'Hamburg', country: 'Germany', mode: 'hybrid', salary: '74.000 – 88.000 €', posted: 'vor 7 Tagen', match: 78, tags: ['Azure', 'C#', 'IoT'], snippet: 'Industrial IoT solutions in the cloud.' },
];

const COUNTRIES = ['All countries', 'Germany', 'Austria', 'Switzerland', 'Remote · EU'];

/* ---- Job-API providers (Jobquellen). Connect these to pull live jobs. ---- */
const PROVIDERS = [
  { id: 'ba', name: 'Bundesagentur für Arbeit', tile: '#d4002a', kind: 'Public job board', auth: 'public', connected: true, jobs: 3, lastSync: '4 min ago', desc: "Germany's official federal employment agency job board. No credentials needed.", region: 'DE' },
  { id: 'adzuna', name: 'Adzuna', tile: '#7c3aed', kind: 'Aggregator', auth: 'apikey', connected: true, jobs: 4, lastSync: '12 min ago', desc: 'Aggregates postings from thousands of sources. App ID + API key.', region: 'DE · AT · CH' },
  { id: 'arbeitnow', name: 'Arbeitnow', tile: '#0891b2', kind: 'Aggregator', auth: 'public', connected: true, jobs: 2, lastSync: '4 min ago', desc: 'Tech & English-language jobs across Europe. Open API.', region: 'EU' },
  { id: 'remotive', name: 'Remotive', tile: '#1f8a5b', kind: 'Remote', auth: 'public', connected: false, jobs: 0, lastSync: null, desc: 'Curated remote jobs worldwide. Open API.', region: 'Remote' },
  { id: 'stepstone', name: 'StepStone', tile: '#0a6b3b', kind: 'Job board', auth: 'oauth', connected: false, jobs: 0, lastSync: null, desc: 'Large DACH job board. Partner access via OAuth required.', region: 'DE · AT' },
  { id: 'indeed', name: 'Indeed', tile: '#2557a7', kind: 'Aggregator', auth: 'oauth', connected: false, jobs: 0, lastSync: null, desc: "World's largest job aggregator. Publisher account needed.", region: 'Global' },
  { id: 'linkedin', name: 'LinkedIn Jobs', tile: '#0a66c2', kind: 'Network', auth: 'oauth', connected: false, jobs: 0, lastSync: null, desc: 'Jobs from your network. OAuth sign-in required.', region: 'Global' },
  { id: 'xing', name: 'XING / New Work', tile: '#0698a0', kind: 'Network', auth: 'oauth', connected: false, jobs: 0, lastSync: null, desc: 'DACH career network. OAuth sign-in required.', region: 'DE · AT · CH' },
];

/* which provider each sample job came from (connected sources only) */
const _jobSource = { j1: 'Bundesagentur für Arbeit', j2: 'Arbeitnow', j3: 'Adzuna', j4: 'Adzuna', j5: 'Arbeitnow', j6: 'Adzuna', j7: 'Adzuna', j8: 'Bundesagentur für Arbeit', j9: 'Adzuna' };
JOBS.forEach((j) => { j.source = _jobSource[j.id] || 'Adzuna'; });

/* where you actually apply — each company has its own page (manual send) */
const _apply = {
  j1: { via: 'Unternehmensseite', url: 'careers.celonis.com' },
  j2: { via: 'Unternehmensseite', url: 'gitlab.com/jobs' },
  j3: { via: 'Unternehmensseite', url: 'jobs.bitpanda.com' },
  j4: { via: 'Unternehmensseite', url: 'jobs.zalando.com' },
  j5: { via: 'E-Mail', url: 'jobs@frequenz.com' },
  j6: { via: 'Unternehmensseite', url: 'proton.me/careers' },
  j7: { via: 'LinkedIn Easy Apply', url: 'linkedin.com/jobs/n26' },
  j8: { via: 'Unternehmensseite', url: 'jobs.sap.com' },
  j9: { via: 'Unternehmensseite', url: 'siemens.com/careers' },
};
JOBS.forEach((j) => { const a = _apply[j.id] || { via: 'Unternehmensseite', url: j.company.toLowerCase().replace(/\s+/g, '') + '.com/jobs' }; j.applyVia = a.via; j.applyUrl = a.url; });

let _draftN = 0;

const anschreibenTemplate = (job) =>
  `Dear ${job.company} team,\n\nI read your posting for the ${job.role} role in ${job.city} with great interest. ` +
  `As an M.Sc. Software Engineer focused on ${job.tags.slice(0, 2).join(' and ')}, I bring exactly the experience you are looking for.\n\n` +
  `I would welcome the opportunity to discuss my application in person.\n\nKind regards\nSuhay Sevinc`;

function makeDraft(job, opts) {
  _draftN += 1;
  const today = '2026-06-26';
  return {
    id: 'draft' + _draftN, company: job.company, tile: job.tile, role: job.role,
    location: `${job.city} · ${job.mode}`, sent: null, created: today,
    channel: 'myJob', via: 'Job search', status: 'draft', statusLabel: 'Draft', draft: true,
    applyVia: job.applyVia, applyUrl: job.applyUrl,
    docs: opts.docs, salaryAsked: opts.salary || '—', anschreiben: opts.anschreiben,
    lastReply: null, awaiting: false, nextStep: 'Not sent yet — submit when ready.',
    recruiter: null, notes: opts.notes || 'Created and saved from the job search.',
    timeline: [{ date: today, label: 'Application created & saved', kind: 'sent' }],
    match: job.match,
  };
}

/* Split a job's required skills against the candidate's: which they already
   have vs. which the job would add. Mirrors the server-side Matcher; here it
   only powers the "+ neue Skills" hint on stretch-tier jobs. */
function skillMatch(job) {
  const have = new Set((ME.skills || []).map((s) => s.toLowerCase()));
  const matched = [];
  const missing = [];
  (job.tags || []).forEach((t) => (have.has(t.toLowerCase()) ? matched : missing).push(t));
  return { matched, missing };
}

/* ============================================================
   Live backend wiring. The Jobsuche and the Anschreiben-Generator
   talk to the REST API (server/src) instead of the sample data above.
   Base URL is same-origin when served by the app server; override via
   window.KARRIERE_API for a split dev setup.
   ============================================================ */
const API_BASE = (typeof window !== 'undefined' && window.KARRIERE_API) || '/api/v1';

/* Deterministic brand-tile color from a company name (no real logos). */
function tileColor(name) {
  let h = 0;
  for (let i = 0; i < (name || '').length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return `hsl(${h % 360}, 58%, 45%)`;
}

/* Map a backend ScoredJob → the shape the Jobsuche UI renders. */
function mapJob(j) {
  const apply = j.url ? new URL(j.url, 'https://x').host.replace(/^www\./, '') : null;
  return {
    id: j.id,
    company: j.company || '—',
    role: j.role || '—',
    city: j.city || '—',
    country: j.country || '—',
    mode: j.mode || '—',
    salary: j.salary || '—',
    posted: j.posted || '—',
    match: typeof j.match === 'number' ? j.match : 0,
    tags: j.skills || [],
    missingSkills: j.missingSkills || [],
    snippet: j.snippet || 'No description available.',
    source: j.source || 'Quelle',
    tile: tileColor(j.company),
    url: j.url || null,
    applyVia: j.url ? 'Stellenanzeige' : '—',
    applyUrl: apply || (j.url ? j.url : 'Keine Bewerbungs-URL'),
  };
}

async function jsonOrThrow(res) {
  if (!res.ok) throw new Error(`API ${res.status}`);
  return res.json();
}

const api = {
  /* GET /jobs — returns { jobs, top, more, counts } already mapped to UI shape. */
  async searchJobs({ country, city, q } = {}) {
    const params = new URLSearchParams();
    if (country && country !== 'All countries') params.set('country', country);
    if (city) params.set('city', city);
    if (q) params.set('q', q);
    const data = await jsonOrThrow(await fetch(`${API_BASE}/jobs?${params.toString()}`));
    const top = (data.top || []).map(mapJob);
    const more = (data.more || []).map(mapJob);
    return { top, more, jobs: [...top, ...more], counts: data.counts || { total: top.length + more.length } };
  },
  /* POST /cover-letter — { text, provider }. */
  async generateCoverLetter(job) {
    return jsonOrThrow(
      await fetch(`${API_BASE}/cover-letter`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ company: job.company, role: job.role, city: job.city, skills: job.tags || [] }),
      }),
    );
  },
  /* GET/PUT /settings/llm — provider selection. */
  async getLlmSettings() {
    return jsonOrThrow(await fetch(`${API_BASE}/settings/llm`));
  },
  async setLlmProvider(provider, apiKey) {
    const body = apiKey === undefined ? { provider } : { provider, apiKey };
    return jsonOrThrow(
      await fetch(`${API_BASE}/settings/llm`, {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      }),
    );
  },
};

window.KarriereData = { ME, DOC, APPLICATIONS, POSITIONS, JOBS, COUNTRIES, PROVIDERS, fmtEUR, positionTotal, anschreibenTemplate, makeDraft, skillMatch, api, mapJob, tileColor };
})();
