/* myJob — candidate-centric data model.
   Core object = TALENT. "Me" (me) is talent #1; representing others is the
   Agency extension. Each talent owns a resume, attachments and applications. */

const STAGES_ORDER = ['new', 'review', 'interview', 'offer', 'hired'];
const STAGE_LABELS = { new: 'Submitted', review: 'In review', interview: 'Interview', offer: 'Offer', hired: 'Hired', rejected: 'Rejected' };

/* ---------- Anhänge (documents) — shared library per talent ---------- */
const ME_ATTACHMENTS = [
  { id: 'at1', name: 'Arbeitszeugnis — Aurora Systems', tag: 'Zeugnis', sub: '2 Seiten · PDF', kind: 'zeugnis' },
  { id: 'at2', name: 'M.Sc. Zeugnis — TU Berlin', tag: 'Zeugnis', sub: '1 Seite · PDF', kind: 'zeugnis' },
  { id: 'at3', name: 'Zertifikat — CKA Kubernetes', tag: 'Zertifikat', sub: '1 Seite · PDF', kind: 'zertifikat' },
  { id: 'at4', name: 'Empfehlungsschreiben — M. Vogel', tag: 'Referenz', sub: '1 Seite · PDF', kind: 'referenz' },
];

/* ---------- Lebenslauf for "Me" ---------- */
const ME_RESUME = {
  summary: 'Backend engineer with 6 years of experience in high-performance, distributed systems. Most recently tech lead of a matching team. Focus areas: C++/Rust, systems design and reliability at scale.',
  experience: [
    { role: 'Tech Lead — Matching-Team', company: 'Aurora Systems GmbH', period: '2023 — present', location: 'Berlin', bullets: ['Owned a real-time matching system handling 40M requests/day', 'Led a team of 5 engineers; reduced latency by 38%'], skills: ['C++', 'Rust', 'gRPC'] },
    { role: 'Senior Backend Engineer', company: 'Nordlicht Software', period: '2020 — 2023', location: 'Hamburg', bullets: ['Built an event-driven platform on Kafka & Kubernetes', 'Led the migration of a monolith to services'], skills: ['Go', 'Kafka', 'Kubernetes'] },
    { role: 'Software Engineer', company: 'Falk & Partner', period: '2018 — 2020', location: 'Munich', bullets: ['Developed high-load APIs for the consulting division'], skills: ['Python', 'PostgreSQL'] },
  ],
  education: [
    { degree: 'M.Sc. Computer Science', school: 'TU Berlin', period: '2016 — 2018', note: 'Focus on Distributed Systems · 1.3' },
    { degree: 'B.Sc. Computer Science', school: 'University of Hamburg', period: '2013 — 2016', note: '1.7' },
  ],
  skillGroups: [
    { label: 'Languages', items: ['C++', 'Rust', 'Go', 'Python'] },
    { label: 'Systems', items: ['gRPC', 'Kubernetes', 'Kafka', 'PostgreSQL'] },
    { label: 'Methods', items: ['Systemdesign', 'Observability', 'Code Review'] },
  ],
};

/* ---------- Anschreiben for "Me" (default, pro Stelle anpassbar) ---------- */
const ME_LETTER = {
  firma: 'Aurora Systems GmbH',
  ansprechpartner: 'Dr. Petra Lindner',
  strasse: 'Lichtstrasse 12',
  plzOrt: '10115 Berlin',
  betreff: 'Application for Senior C++ Engineer — Platform Team',
  anrede: 'Dear Dr. Lindner,',
  absaetze: [
    'I read your posting with great interest. Distributed, latency-critical systems have been my craft for six years — and your platform team works on exactly the problems that drive me.',
    'As tech lead at Aurora Systems I own a real-time matching system handling 40M requests per day and reduced latency by 38%. My focus is on C++ and Rust, clean systems design and the reliability of large services.',
    'I would be glad to show you in person how I can bring this experience to your team. I look forward to an invitation.',
  ],
  gruss: 'Kind regards',
};

/* ---------- Talents (the pool) — "me" pinned first ---------- */
const TALENTS = [
  {
    id: 'me', me: true, name: 'Suhay Sevinc', role: 'M.Sc. Software Engineer', headline: 'Senior C++ / Distributed Systems',
    src: '../../assets/img/candidate-portrait-sm.jpg', location: 'Berlin', email: 'suhay.sevinc@example.de', phone: '+49 151 2345 6789',
    linkedin: 'linkedin.com/in/suhaysevinc', availability: 'in 3 months', salary: '78.000 €', score: 88,
    skills: ['C++', 'Rust', 'Distributed Systems', 'gRPC', 'Kubernetes'],
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

Object.assign(window, { STAGES_ORDER, STAGE_LABELS, TALENTS, APPLICATIONS, JOBS, MESSAGES, KPIS, CLIENTS, MANDATES, PLACEMENTS, VERMITTLER_KPIS });
