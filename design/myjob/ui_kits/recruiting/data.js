/* myJob — candidate-centric data model.
   Core object = TALENT. "Me" (me) is talent #1; representing others is the
   Agency extension. Each talent owns a resume, attachments and applications. */

const STAGES_ORDER = ['new', 'review', 'interview', 'offer', 'hired'];
const STAGE_LABELS = { new: 'Submitted', review: 'In review', interview: 'Interview', offer: 'Offer', hired: 'Hired', rejected: 'Rejected' };

/* ---------- Anhänge (documents) — shared library per talent ---------- */
const ME_ATTACHMENTS = [
  { id: 'at1', name: 'Reference letter — TRUMPF SE + Co. KG', tag: 'Reference', sub: '2 pages · PDF', kind: 'zeugnis' },
  { id: 'at2', name: 'M.Sc. transcript — Furtwangen University', tag: 'Reference', sub: '1 page · PDF', kind: 'zeugnis' },
  { id: 'at3', name: 'ISAQB Foundation Level — Certificate', tag: 'Certificate', sub: '1 page · PDF', kind: 'zertifikat' },
  { id: 'at4', name: 'Clean Code C++17 — Certificate', tag: 'Certificate', sub: '1 page · PDF', kind: 'zertifikat' },
];

/* ---------- Résumé for "Me" ---------- */
const ME_RESUME = {
  summary:
    'Software Engineer (M.Sc.) with over 7 years of experience in hardware-near, distributed and safety-critical software development (C++ and C#/.NET). Focus areas: complex system architectures, modern DevOps practices (CI/CD) and agile methods.',
  experience: [
    { role: 'Software Engineer', company: 'Rheinmetall Air Defence AG', period: '11/2024 — present', location: 'Zurich (CH)', bullets: ['Developed core control software for the Oerlikon Skynex® for control nodes and fire-control units', 'Implemented tactical communication protocols (TCP, REST, Protobuf) connecting sensors, effectors and simulations', 'Built QML user interfaces and rolled out Gitflow + CI/CD across the team'], skills: ['C++20', 'QML', 'Protobuf', 'REST'] },
    { role: 'Software Engineer C++ / C#', company: 'TRUMPF SE + Co. KG', period: '03/2019 — 10/2024', location: 'Schramberg (DE)', bullets: ['Advanced a C++ vision system; raised camera throughput from 60 to 280 FPS', 'Built a .NET/gRPC Quality Data Store and a CAD/CAM microservice (C#)', 'Scrum Master of a 5-person team; developed OPC-UA/gRPC integration'], skills: ['C++17', 'C#', '.NET', 'gRPC', 'OPC-UA'] },
  ],
  education: [
    { degree: 'M.Sc. Computer Science', school: 'Furtwangen University', period: '2017 — 2019', note: 'Focus on Software Engineering · grade 1.9' },
    { degree: 'B.Sc. General Computer Science', school: 'Furtwangen University', period: '2014 — 2017', note: 'grade 2.2' },
  ],
  skillGroups: [
    { label: 'Languages', items: ['C++20', 'C# / .NET', 'Python'] },
    { label: 'Protocols & APIs', items: ['gRPC', 'Protobuf', 'OPC-UA', 'REST', 'MQTT'] },
    { label: 'Architecture & DevOps', items: ['Microservices', 'Clean Architecture', 'ISAQB', 'Docker', 'CI/CD'] },
  ],
};

/* ---------- Cover letter for "Me" (default, customizable per role) ---------- */
const ME_LETTER = {
  firma: '[Company name]',
  ansprechpartner: '[Contact / HR department]',
  strasse: '[Street and number]',
  plzOrt: '[Postal code, city]',
  betreff: 'Application for [job title]',
  anrede: 'Dear Sir or Madam,',
  absaetze: [
    'I read your posting with great interest. As a Software Engineer (M.Sc.) with over 7 years of experience in C++ and C#/.NET, I bring exactly the technical profile you are looking for.',
    'I currently develop control software for the Oerlikon Skynex® system at Rheinmetall Air Defence AG in Zurich — including tactical communication protocols and QML interfaces. Before that, I shaped vision systems, microservices and CI/CD pipelines at TRUMPF for over five years.',
    'I would be glad to show you in person how I can contribute with modern C++ development, system architecture and DevOps.',
  ],
  gruss: 'Kind regards',
};

/* ---------- Talents (the pool) — "me" pinned first ---------- */
const TALENTS = [
  {
    id: 'me', me: true, name: 'Suhay Sevinc', role: 'M.Sc. Software Engineer', headline: 'Senior C++ / C# · real-time & distributed systems',
    src: '../../assets/img/candidate-portrait-sm.jpg', location: 'Blumberg, DE', email: 'suhay.sevinc@gmail.com', phone: '+49 176 91407840',
    linkedin: 'linkedin.com/in/suhay-sevinc', availability: 'immediately', salary: 'CHF 120–140k', score: 88,
    skills: ['C++20', 'C# / .NET', 'Qt / QML', 'Microservices', 'gRPC'],
    resume: ME_RESUME, letter: ME_LETTER, attachments: ME_ATTACHMENTS,
  },
];

/* ---------- Bewerbungen (applications) — belong to a talent ---------- */
const APPLICATIONS = [
  { id: 'b1', talentId: 'me', company: 'Aurora Systems GmbH', role: 'Senior C++ Engineer', location: 'Berlin · Hybrid', status: 'interview', date: '12.06.2026', next: 'Tech interview · 24.06.', score: 88, attachments: ['at1', 'at3'], anschreiben: true },
  { id: 'b2', talentId: 'me', company: 'Meridian Labs', role: 'Distributed Systems Eng.', location: 'Remote', status: 'review', date: '09.06.2026', next: 'In review', score: 84, attachments: ['at1', 'at2'], anschreiben: true },
  { id: 'b3', talentId: 'me', company: 'Falk & Partner', role: 'Platform Engineer', location: 'Munich', status: 'offer', date: '05.06.2026', next: 'Offer — due 28.06.', score: 90, attachments: ['at1', 'at2', 'at4'], anschreiben: true },
  { id: 'b4', talentId: 'me', company: 'Hansa Digital', role: 'C++ Tech Lead', location: 'Bremen', status: 'rejected', date: '28.05.2026', next: 'Unfortunately rejected', score: 70, attachments: ['at1'], anschreiben: true },
  { id: 'b5', talentId: 'me', company: 'Nordlicht Software', role: 'Backend Engineer', location: 'Hamburg', status: 'new', date: '02.06.2026', next: 'Submitted', score: 80, attachments: ['at1', 'at3'], anschreiben: false },
];

/* ---------- Stellen (saved open positions) ---------- */
const JOBS = [
  { id: 'j1', title: 'Senior C++ Engineer', company: 'Aurora Systems GmbH', location: 'Berlin · Hybrid', type: 'Full-time', salary: '€75–90k', match: 92, saved: true },
  { id: 'j2', title: 'Distributed Systems Eng.', company: 'Meridian Labs', location: 'Remote (DE)', type: 'Full-time', salary: '€80–95k', match: 86, saved: true },
  { id: 'j3', title: 'Backend Engineer (Rust)', company: 'Hojo Tech', location: 'Berlin', type: 'Full-time', salary: '€70–85k', match: 79, saved: false },
  { id: 'j4', title: 'Platform Engineer', company: 'Falk & Partner', location: 'Munich', type: 'Full-time', salary: '€72–88k', match: 83, saved: true },
];

const MESSAGES = [
  { id: 'm1', appId: 'b1', from: 'Aurora Systems · Recruiting', text: 'We would be glad to invite you to the tech interview on June 24 at 14:00.', when: '2 hrs ago', unread: true },
  { id: 'm2', appId: 'b3', from: 'Falk & Partner · HR', text: 'Please find our offer attached. We would appreciate a reply by June 28.', when: '5 hrs ago', unread: true },
  { id: 'm3', appId: 'b5', from: 'Nordlicht Software', text: 'Thanks for applying — your application is now under review.', when: 'yesterday', unread: false },
  { id: 'm4', appId: 'b2', from: 'Meridian Labs', text: 'Thank you for the documents, we will be in touch this week.', when: '2 days ago', unread: false },
];

const KPIS = [
  { label: 'Active applications', value: '5', delta: '+2', dir: 'up', icon: 'send' },
  { label: 'In interview', value: '1', delta: '+1', dir: 'up', icon: 'message' },
  { label: 'Offers', value: '1', delta: '+1', dir: 'up', icon: 'award' },
  { label: 'Response rate', value: '63%', delta: '+5%', dir: 'up', icon: 'trend' },
];

/* ===== Vermittler-Seite (du betreibst die Vermittlung selbst) =====
   Clients → Mandates (search assignments with fee) → Placements. */
const CLIENTS = [
  { id: 'k1', name: 'Aurora Systems GmbH', industry: 'SaaS · Platform', location: 'Berlin', since: '2024' },
  { id: 'k2', name: 'Nordlicht Software', industry: 'Fintech', location: 'Hamburg', since: '2025' },
  { id: 'k3', name: 'Falk & Partner', industry: 'Consulting', location: 'Munich', since: '2023' },
  { id: 'k4', name: 'Meridian Labs', industry: 'AI · Research', location: 'Remote', since: '2026' },
];

const MANDATES = [
  { id: 'ma1', clientId: 'k1', role: 'Senior C++ Engineer', location: 'Berlin · Hybrid', fee: '22%', feeValue: '€17,160', deadline: '30.06.2026', priority: 'high', submitted: 4, interviews: 2, status: 'active' },
  { id: 'ma2', clientId: 'k1', role: 'DevOps Engineer', location: 'Berlin', fee: '20%', feeValue: '€14,000', deadline: '15.07.2026', priority: 'medium', submitted: 2, interviews: 1, status: 'active' },
  { id: 'ma3', clientId: 'k2', role: 'Backend Engineer', location: 'Hamburg', fee: '22%', feeValue: '€16,500', deadline: '10.07.2026', priority: 'high', submitted: 3, interviews: 1, status: 'active' },
  { id: 'ma4', clientId: 'k3', role: 'Platform Engineer', location: 'Munich', fee: '18%', feeValue: '€12,200', deadline: '05.07.2026', priority: 'low', submitted: 1, interviews: 0, status: 'paused' },
  { id: 'ma5', clientId: 'k4', role: 'Distributed Systems Eng.', location: 'Remote', fee: '24%', feeValue: '€19,800', deadline: '20.07.2026', priority: 'medium', submitted: 2, interviews: 1, status: 'active' },
];

const PLACEMENTS = [
  { id: 'pl1', candName: 'Mara Vogel', candRole: 'Engineering Manager', client: 'Aurora Systems GmbH', start: '01.07.2026', fee: '€19,000', status: 'Invoiced' },
  { id: 'pl2', candName: 'Lena Brandt', candRole: 'Brand Designer', client: 'Nordlicht Software', start: '15.06.2026', fee: '€12,600', status: 'Paid' },
  { id: 'pl3', candName: 'Aylin Demir', candRole: 'UX Researcher', client: 'Meridian Labs', start: '01.08.2026', fee: '€17,000', status: 'Probation' },
];

const VERMITTLER_KPIS = [
  { label: 'Active mandates', value: '5', delta: '+2', dir: 'up', icon: 'briefcase' },
  { label: 'Talents in pool', value: '4', delta: '+1', dir: 'up', icon: 'users' },
  { label: 'Placements Q2', value: '7', delta: '+3', dir: 'up', icon: 'award' },
  { label: 'Fees Q2', value: '€128k', delta: '+18%', dir: 'up', icon: 'trend' },
];

Object.assign(window, { STAGES_ORDER, STAGE_LABELS, TALENTS, APPLICATIONS, JOBS, MESSAGES, KPIS, CLIENTS, MANDATES, PLACEMENTS, VERMITTLER_KPIS });
