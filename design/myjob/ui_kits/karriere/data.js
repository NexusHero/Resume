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
};

/* short codes shown as chips on each application */
const DOC = { cv: 'Lebenslauf', anschreiben: 'Anschreiben', mappe: 'Mappe', zeugnisse: 'Zeugnisse', portfolio: 'Portfolio' };

/* a brand tile color per company (no real logos) */
const APPLICATIONS = [
  {
    id: 'a1', company: 'Celonis', tile: '#6366f1', role: 'Senior C++ Engineer', location: 'München · hybrid',
    sent: '2026-06-18', channel: 'Stellenportal', via: 'myJob', status: 'interview', statusLabel: 'Interview',
    docs: ['cv', 'anschreiben', 'mappe'], salaryAsked: '88.000 €',
    lastReply: '2026-06-22', awaiting: false, nextStep: 'Tech-Interview · 30. Juni, 14:00',
    recruiter: { name: 'Jana Pohl', role: 'Tech Recruiter' },
    notes: 'Zweites Gespräch terminiert. Auf System-Design vorbereiten (gRPC, Sharding).',
    timeline: [
      { date: '2026-06-18', label: 'Bewerbung gesendet', kind: 'sent' },
      { date: '2026-06-19', label: 'Eingang bestätigt', kind: 'ack' },
      { date: '2026-06-22', label: 'Einladung zum Interview', kind: 'interview' },
    ],
  },
  {
    id: 'a2', company: 'Trade Republic', tile: '#0f172a', role: 'Backend Engineer (Rust)', location: 'Berlin · remote',
    sent: '2026-06-11', channel: 'Website', via: 'direkt', status: 'review', statusLabel: 'In Prüfung',
    docs: ['cv', 'anschreiben'], salaryAsked: '85.000 €',
    lastReply: '2026-06-12', awaiting: true, nextStep: null,
    recruiter: { name: 'Talent Team', role: 'People' },
    notes: 'Eingang bestätigt, seitdem still. Am 27.06 nachfassen.',
    timeline: [
      { date: '2026-06-11', label: 'Bewerbung gesendet', kind: 'sent' },
      { date: '2026-06-12', label: 'Eingang bestätigt', kind: 'ack' },
    ],
  },
  {
    id: 'a3', company: 'N26', tile: '#1f8a5b', role: 'Platform Engineer', location: 'Berlin · hybrid',
    sent: '2026-06-02', channel: 'LinkedIn', via: 'Empfehlung', status: 'offer', statusLabel: 'Angebot',
    docs: ['cv', 'anschreiben', 'mappe', 'zeugnisse'], salaryAsked: '90.000 €',
    lastReply: '2026-06-20', awaiting: false, nextStep: 'Angebot prüfen · Frist 30. Juni',
    recruiter: { name: 'Marco Reus', role: 'Hiring Manager' },
    notes: 'Angebot 92.000 € + 10% Bonus. Gegen Celonis abwägen.',
    timeline: [
      { date: '2026-06-02', label: 'Bewerbung gesendet', kind: 'sent' },
      { date: '2026-06-04', label: 'Eingang bestätigt', kind: 'ack' },
      { date: '2026-06-09', label: 'Screening-Call', kind: 'interview' },
      { date: '2026-06-16', label: 'Onsite (3 Runden)', kind: 'interview' },
      { date: '2026-06-20', label: 'Angebot erhalten', kind: 'offer' },
    ],
  },
  {
    id: 'a4', company: 'Personio', tile: '#0a5dff', role: 'Software Engineer · Backend', location: 'München · hybrid',
    sent: '2026-05-28', channel: 'Stellenportal', via: 'myJob', status: 'rejected', statusLabel: 'Absage',
    docs: ['cv', 'anschreiben'], salaryAsked: '82.000 €',
    lastReply: '2026-06-10', awaiting: false, nextStep: null,
    recruiter: { name: 'Recruiting', role: 'People' },
    notes: 'Absage nach Screening — Profil zu Infra-lastig. Feedback war fair.',
    timeline: [
      { date: '2026-05-28', label: 'Bewerbung gesendet', kind: 'sent' },
      { date: '2026-05-30', label: 'Eingang bestätigt', kind: 'ack' },
      { date: '2026-06-10', label: 'Absage', kind: 'rejected' },
    ],
  },
  {
    id: 'a5', company: 'SAP', tile: '#0a6ed1', role: 'Cloud Engineer', location: 'Walldorf · hybrid',
    sent: '2026-05-20', channel: 'Website', via: 'direkt', status: 'review', statusLabel: 'In Prüfung',
    docs: ['cv', 'anschreiben', 'zeugnisse'], salaryAsked: '80.000 €',
    lastReply: null, awaiting: true, nextStep: null,
    recruiter: null,
    notes: 'Keine Bestätigung erhalten — Eingang unklar. Dringend nachfassen.',
    timeline: [
      { date: '2026-05-20', label: 'Bewerbung gesendet', kind: 'sent' },
    ],
  },
  {
    id: 'a6', company: 'Zalando', tile: '#ff6900', role: 'Senior Software Engineer', location: 'Berlin · remote',
    sent: '2026-05-09', channel: 'LinkedIn', via: 'myJob', status: 'interview', statusLabel: 'Interview',
    docs: ['cv', 'anschreiben', 'portfolio'], salaryAsked: '86.000 €',
    lastReply: '2026-05-26', awaiting: true, nextStep: 'Warte auf Feedback nach 2. Runde',
    recruiter: { name: 'Lea Sommer', role: 'Tech Recruiter' },
    notes: 'Zwei Runden gut gelaufen. Seit 26.05 keine Rückmeldung — nachfassen.',
    timeline: [
      { date: '2026-05-09', label: 'Bewerbung gesendet', kind: 'sent' },
      { date: '2026-05-12', label: 'Eingang bestätigt', kind: 'ack' },
      { date: '2026-05-19', label: '1. Interview', kind: 'interview' },
      { date: '2026-05-26', label: '2. Interview', kind: 'interview' },
    ],
  },
  {
    id: 'a7', company: 'Check24', tile: '#005ea8', role: 'Backend Developer', location: 'München · vor Ort',
    sent: '2026-04-30', channel: 'Stellenportal', via: 'direkt', status: 'rejected', statusLabel: 'Absage',
    docs: ['cv', 'anschreiben'], salaryAsked: '78.000 €',
    lastReply: '2026-05-14', awaiting: false, nextStep: null,
    recruiter: null,
    notes: 'Absage. Vor-Ort-Pflicht war ohnehin ein Ausschluss.',
    timeline: [
      { date: '2026-04-30', label: 'Bewerbung gesendet', kind: 'sent' },
      { date: '2026-05-14', label: 'Absage', kind: 'rejected' },
    ],
  },
];

/* ---- Work history with earnings. Two comp models:
        'salary'  → monthly gross (with raises) → total paid to date
        'hourly'  → rate × hours logged per month                       ---- */
const POSITIONS = [
  {
    id: 'p1', company: 'Aleph Systems', tile: '#2563eb', role: 'Senior Software Engineer',
    type: 'Festanstellung', location: 'Berlin · hybrid', current: true,
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
    type: 'Festanstellung', location: 'München · vor Ort', current: false,
    start: '2021-09', end: '2024-02', model: 'salary',
    salary: [
      { from: '2021-09', gross: 5200 },
      { from: '2023-01', gross: 5700 },
    ],
    bonusPaid: 5400,
  },
  {
    id: 'p3', company: 'TU Berlin · Lehrstuhl DS', tile: '#1f8a5b', role: 'Wissensch. Mitarbeiter (Werkstudent)',
    type: 'Werkstudent', location: 'Berlin', current: false,
    start: '2020-04', end: '2021-08', model: 'hourly',
    rate: 17.5, // €/h
    hours: [ // hours logged per month (sampled)
      { month: '2020 Q2', h: 220 }, { month: '2020 Q3', h: 240 },
      { month: '2020 Q4', h: 250 }, { month: '2021 Q1', h: 245 },
      { month: '2021 Q2', h: 230 },
    ],
  },
  {
    id: 'p4', company: 'Freelance · diverse', tile: '#c2410c', role: 'Freelance Developer',
    type: 'Freiberuflich', location: 'remote', current: true,
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
  { id: 'j1', company: 'Celonis', tile: '#6366f1', role: 'Senior C++ Engineer', city: 'München', country: 'Deutschland', mode: 'hybrid', salary: '85.000 – 98.000 €', posted: 'vor 2 Tagen', match: 94, tags: ['C++', 'gRPC', 'Distributed Systems'], snippet: 'Kerngeschäftslogik der Process-Mining-Engine in modernem C++20.' },
  { id: 'j2', company: 'GitLab', tile: '#fc6d26', role: 'Backend Engineer (Rust)', city: 'Remote', country: 'Remote · EU', mode: 'remote', salary: '80.000 – 95.000 €', posted: 'vor 4 Tagen', match: 90, tags: ['Rust', 'PostgreSQL', 'Remote'], snippet: 'Vollständig remote, asynchrone Kultur, Open-Source-Codebasis.' },
  { id: 'j3', company: 'Bitpanda', tile: '#1d4ed8', role: 'Platform Engineer', city: 'Wien', country: 'Österreich', mode: 'hybrid', salary: '70.000 – 88.000 €', posted: 'vor 1 Tag', match: 86, tags: ['Kubernetes', 'Go', 'AWS'], snippet: 'Skalierung der Trading-Plattform für Millionen Nutzer:innen.' },
  { id: 'j4', company: 'Zalando', tile: '#ff6900', role: 'Senior Software Engineer', city: 'Berlin', country: 'Deutschland', mode: 'remote', salary: '82.000 – 96.000 €', posted: 'vor 6 Tagen', match: 88, tags: ['Scala', 'Kafka', 'Microservices'], snippet: 'Event-getriebene Services im Fashion-Commerce-Backend.' },
  { id: 'j5', company: 'Frequenz', tile: '#1f8a5b', role: 'Distributed Systems Engineer', city: 'Berlin', country: 'Deutschland', mode: 'hybrid', salary: '78.000 – 92.000 €', posted: 'vor 3 Tagen', match: 91, tags: ['Rust', 'gRPC', 'Energy'], snippet: 'Echtzeit-Steuerung dezentraler Energienetze.' },
  { id: 'j6', company: 'Proton', tile: '#6d4aff', role: 'C++ Software Engineer', city: 'Zürich', country: 'Schweiz', mode: 'vor Ort', salary: 'CHF 120k – 140k', posted: 'vor 5 Tagen', match: 83, tags: ['C++', 'Cryptography', 'Privacy'], snippet: 'Sichere, quelloffene Produkte für Millionen von Nutzer:innen.' },
  { id: 'j7', company: 'N26', tile: '#1f8a5b', role: 'Backend Engineer', city: 'Berlin', country: 'Deutschland', mode: 'hybrid', salary: '75.000 – 90.000 €', posted: 'vor 8 Tagen', match: 87, tags: ['Java', 'Spring', 'Fintech'], snippet: 'Bezahl- und Konto-Services der mobilen Bank.' },
  { id: 'j8', company: 'Dynatrace', tile: '#1496ff', role: 'Senior Backend Engineer', city: 'Linz', country: 'Österreich', mode: 'hybrid', salary: '72.000 – 89.000 €', posted: 'vor 2 Tagen', match: 80, tags: ['Java', 'Observability', 'Cloud'], snippet: 'Observability-Plattform für große Cloud-Umgebungen.' },
  { id: 'j9', company: 'Siemens', tile: '#009999', role: 'Cloud Software Engineer', city: 'Hamburg', country: 'Deutschland', mode: 'hybrid', salary: '74.000 – 88.000 €', posted: 'vor 7 Tagen', match: 78, tags: ['Azure', 'C#', 'IoT'], snippet: 'Industrielle IoT-Lösungen in der Cloud.' },
];

const COUNTRIES = ['Alle Länder', 'Deutschland', 'Österreich', 'Schweiz', 'Remote · EU'];

/* ---- Job-API providers (Jobquellen). Connect these to pull live jobs. ---- */
const PROVIDERS = [
  { id: 'ba', name: 'Bundesagentur für Arbeit', tile: '#d4002a', kind: 'Öffentliche Jobbörse', auth: 'public', connected: true, jobs: 3, lastSync: 'vor 4 Min', desc: 'Offizielle Stellenbörse der Bundesagentur. Keine Zugangsdaten nötig.', region: 'DE' },
  { id: 'adzuna', name: 'Adzuna', tile: '#7c3aed', kind: 'Aggregator', auth: 'apikey', connected: true, jobs: 4, lastSync: 'vor 12 Min', desc: 'Aggregiert Stellen aus tausenden Quellen. App ID + API Key.', region: 'DE · AT · CH' },
  { id: 'arbeitnow', name: 'Arbeitnow', tile: '#0891b2', kind: 'Aggregator', auth: 'public', connected: true, jobs: 2, lastSync: 'vor 4 Min', desc: 'Tech- & englischsprachige Jobs in Europa. Offene API.', region: 'EU' },
  { id: 'remotive', name: 'Remotive', tile: '#1f8a5b', kind: 'Remote', auth: 'public', connected: false, jobs: 0, lastSync: null, desc: 'Kuratierte Remote-Jobs weltweit. Offene API.', region: 'Remote' },
  { id: 'stepstone', name: 'StepStone', tile: '#0a6b3b', kind: 'Jobbörse', auth: 'oauth', connected: false, jobs: 0, lastSync: null, desc: 'Große DACH-Jobbörse. Partner-Zugang via OAuth erforderlich.', region: 'DE · AT' },
  { id: 'indeed', name: 'Indeed', tile: '#2557a7', kind: 'Aggregator', auth: 'oauth', connected: false, jobs: 0, lastSync: null, desc: 'Weltweit größter Job-Aggregator. Publisher-Konto nötig.', region: 'Global' },
  { id: 'linkedin', name: 'LinkedIn Jobs', tile: '#0a66c2', kind: 'Netzwerk', auth: 'oauth', connected: false, jobs: 0, lastSync: null, desc: 'Jobs aus deinem Netzwerk. OAuth-Anmeldung erforderlich.', region: 'Global' },
  { id: 'xing', name: 'XING / New Work', tile: '#0698a0', kind: 'Netzwerk', auth: 'oauth', connected: false, jobs: 0, lastSync: null, desc: 'DACH-Karrierenetzwerk. OAuth-Anmeldung erforderlich.', region: 'DE · AT · CH' },
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
  `Sehr geehrtes Team von ${job.company},\n\nmit großem Interesse habe ich Ihre Ausschreibung als ${job.role} in ${job.city} gelesen. ` +
  `Als M.Sc. Software Engineer mit Schwerpunkt ${job.tags.slice(0, 2).join(' und ')} bringe ich genau die Erfahrung mit, die Sie suchen.\n\n` +
  `Über ein persönliches Gespräch freue ich mich sehr.\n\nMit freundlichen Grüßen\nSuhay Sevinc`;

function makeDraft(job, opts) {
  _draftN += 1;
  const today = '2026-06-26';
  return {
    id: 'draft' + _draftN, company: job.company, tile: job.tile, role: job.role,
    location: `${job.city} · ${job.mode}`, sent: null, created: today,
    channel: 'myJob', via: 'Jobsuche', status: 'draft', statusLabel: 'Entwurf', draft: true,
    applyVia: job.applyVia, applyUrl: job.applyUrl,
    docs: opts.docs, salaryAsked: opts.salary || '—', anschreiben: opts.anschreiben,
    lastReply: null, awaiting: false, nextStep: 'Noch nicht gesendet — wenn bereit, abschicken.',
    recruiter: null, notes: opts.notes || 'Aus der Jobsuche erstellt und vorgemerkt.',
    timeline: [{ date: today, label: 'Bewerbung erstellt & vorgemerkt', kind: 'sent' }],
    match: job.match,
  };
}

window.KarriereData = { ME, DOC, APPLICATIONS, POSITIONS, JOBS, COUNTRIES, PROVIDERS, fmtEUR, positionTotal, anschreibenTemplate, makeDraft };
})();
