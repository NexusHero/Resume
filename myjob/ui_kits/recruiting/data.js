/* myJob — candidate-centric data model.
   Core object = TALENT. "Ich" (me) is talent #1; representing others is the
   Vermittler extension. Each talent owns a Lebenslauf, Anhänge and Bewerbungen. */

const STAGES_ORDER = ['new', 'review', 'interview', 'offer', 'hired'];
const STAGE_LABELS = { new: 'Eingereicht', review: 'In Prüfung', interview: 'Interview', offer: 'Angebot', hired: 'Zusage', rejected: 'Absage' };

/* ---------- Anhänge (documents) — shared library per talent ---------- */
const ME_ATTACHMENTS = [
  { id: 'at1', name: 'Arbeitszeugnis — Aurora Systems', tag: 'Zeugnis', sub: '2 Seiten · PDF', kind: 'zeugnis' },
  { id: 'at2', name: 'M.Sc. Zeugnis — TU Berlin', tag: 'Zeugnis', sub: '1 Seite · PDF', kind: 'zeugnis' },
  { id: 'at3', name: 'Zertifikat — CKA Kubernetes', tag: 'Zertifikat', sub: '1 Seite · PDF', kind: 'zertifikat' },
  { id: 'at4', name: 'Empfehlungsschreiben — M. Vogel', tag: 'Referenz', sub: '1 Seite · PDF', kind: 'referenz' },
];

/* ---------- Lebenslauf for "Ich" ---------- */
const ME_RESUME = {
  summary: 'Backend-Engineer mit 6 Jahren Erfahrung in hochperformanten, verteilten Systemen. Zuletzt Tech-Lead eines Matching-Teams. Schwerpunkte: C++/Rust, Systemdesign und Zuverlässigkeit im großen Maßstab.',
  experience: [
    { role: 'Tech Lead — Matching-Team', company: 'Aurora Systems GmbH', period: '2023 — heute', location: 'Berlin', bullets: ['Verantwortung für ein Echtzeit-Matching-System mit 40 Mio. Anfragen/Tag', 'Team von 5 Engineers fachlich geführt; Latenz um 38 % reduziert'], skills: ['C++', 'Rust', 'gRPC'] },
    { role: 'Senior Backend Engineer', company: 'Nordlicht Software', period: '2020 — 2023', location: 'Hamburg', bullets: ['Event-getriebene Plattform auf Kafka & Kubernetes aufgebaut', 'Migration eines Monolithen zu Services geleitet'], skills: ['Go', 'Kafka', 'Kubernetes'] },
    { role: 'Software Engineer', company: 'Falk & Partner', period: '2018 — 2020', location: 'München', bullets: ['Hochlast-APIs für den Beratungsbereich entwickelt'], skills: ['Python', 'PostgreSQL'] },
  ],
  education: [
    { degree: 'M.Sc. Informatik', school: 'TU Berlin', period: '2016 — 2018', note: 'Schwerpunkt Verteilte Systeme · 1,3' },
    { degree: 'B.Sc. Informatik', school: 'Universität Hamburg', period: '2013 — 2016', note: '1,7' },
  ],
  skillGroups: [
    { label: 'Sprachen', items: ['C++', 'Rust', 'Go', 'Python'] },
    { label: 'Systeme', items: ['gRPC', 'Kubernetes', 'Kafka', 'PostgreSQL'] },
    { label: 'Methoden', items: ['Systemdesign', 'Observability', 'Code Review'] },
  ],
};

/* ---------- Anschreiben for "Ich" (default, pro Stelle anpassbar) ---------- */
const ME_LETTER = {
  firma: 'Aurora Systems GmbH',
  ansprechpartner: 'Frau Dr. Petra Lindner',
  strasse: 'Lichtstraße 12',
  plzOrt: '10115 Berlin',
  betreff: 'Bewerbung als Senior C++ Engineer — Plattform-Team',
  anrede: 'Sehr geehrte Frau Dr. Lindner,',
  absaetze: [
    'mit großem Interesse habe ich Ihre Ausschreibung gelesen. Verteilte, latenzkritische Systeme sind seit sechs Jahren mein Handwerk — und Ihr Plattform-Team arbeitet genau an den Problemen, die mich antreiben.',
    'Als Tech-Lead bei Aurora Systems verantworte ich ein Echtzeit-Matching-System mit 40 Mio. Anfragen pro Tag und habe die Latenz um 38 % gesenkt. Meine Schwerpunkte liegen in C++ und Rust, im sauberen Systemdesign und in der Zuverlässigkeit großer Dienste.',
    'Gerne zeige ich Ihnen im Gespräch, wie ich diese Erfahrung bei Ihnen einbringen kann. Über eine Einladung freue ich mich sehr.',
  ],
  gruss: 'Mit freundlichen Grüßen',
};

/* ---------- Talents (the pool) — "me" pinned first ---------- */
const TALENTS = [
  {
    id: 'me', me: true, name: 'Suhay Sevinc', role: 'M.Sc. Software Engineer', headline: 'Senior C++ / Distributed Systems',
    src: '../../assets/img/candidate-portrait-sm.jpg', location: 'Berlin', email: 'suhay.sevinc@example.de', phone: '+49 151 2345 6789',
    linkedin: 'linkedin.com/in/suhaysevinc', availability: 'in 3 Monaten', salary: '78.000 €', score: 88,
    skills: ['C++', 'Rust', 'Distributed Systems', 'gRPC', 'Kubernetes'],
    resume: ME_RESUME, letter: ME_LETTER, attachments: ME_ATTACHMENTS,
  },
  { id: 't2', name: 'Lena Brandt', role: 'Product Designerin', headline: 'B2B-SaaS · Design Systems', location: 'Leipzig', email: 'lena.brandt@example.de', phone: '+49 160 1112 2334', availability: 'in 6 Wochen', salary: '64.000 €', score: 81, skills: ['Figma', 'Design Systems', 'Prototyping'], attachments: [] },
  { id: 't3', name: 'Marco Adler', role: 'DevOps Engineer', headline: 'Cloud · Automatisierung', location: 'München', email: 'marco.adler@example.de', phone: '+49 170 5566 7788', availability: 'sofort', salary: '72.000 €', score: 74, skills: ['Terraform', 'AWS', 'CI/CD', 'Go'], attachments: [] },
  { id: 't4', name: 'Aylin Demir', role: 'UX Researcher', headline: 'Qualitative Research', location: 'Berlin', email: 'aylin.demir@example.de', phone: '+49 151 4433 2211', availability: 'in 2 Monaten', salary: '66.000 €', score: 84, skills: ['User Research', 'Interviews', 'Figma'], attachments: [] },
];

/* ---------- Bewerbungen (applications) — belong to a talent ---------- */
const APPLICATIONS = [
  { id: 'b1', talentId: 'me', company: 'Aurora Systems GmbH', role: 'Senior C++ Engineer', location: 'Berlin · Hybrid', status: 'interview', date: '12.06.2026', next: 'Tech-Interview · 24.06.', score: 88, attachments: ['at1', 'at3'], anschreiben: true },
  { id: 'b2', talentId: 'me', company: 'Meridian Labs', role: 'Distributed Systems Eng.', location: 'Remote', status: 'review', date: '09.06.2026', next: 'In Prüfung', score: 84, attachments: ['at1', 'at2'], anschreiben: true },
  { id: 'b3', talentId: 'me', company: 'Falk & Partner', role: 'Plattform-Engineer', location: 'München', status: 'offer', date: '05.06.2026', next: 'Angebot — Frist 28.06.', score: 90, attachments: ['at1', 'at2', 'at4'], anschreiben: true },
  { id: 'b4', talentId: 'me', company: 'Hansa Digital', role: 'C++ Tech Lead', location: 'Bremen', status: 'rejected', date: '28.05.2026', next: 'Leider abgesagt', score: 70, attachments: ['at1'], anschreiben: true },
  { id: 'b5', talentId: 'me', company: 'Nordlicht Software', role: 'Backend Engineer', location: 'Hamburg', status: 'new', date: '02.06.2026', next: 'Eingereicht', score: 80, attachments: ['at1', 'at3'], anschreiben: false },
  { id: 'b6', talentId: 't2', company: 'Aurora Systems GmbH', role: 'Product Designer:in', location: 'Berlin', status: 'interview', date: '10.06.2026', next: 'Portfolio-Call · 26.06.', score: 81, attachments: [], anschreiben: true },
  { id: 'b7', talentId: 't3', company: 'Meridian Labs', role: 'DevOps Engineer', location: 'Remote', status: 'new', date: 'heute', next: 'Eingereicht', score: 74, attachments: [], anschreiben: false },
  { id: 'b8', talentId: 't4', company: 'Nordlicht Software', role: 'UX Researcher', location: 'Hamburg', status: 'offer', date: '04.06.2026', next: 'Angebot erhalten', score: 84, attachments: [], anschreiben: true },
  { id: 'b9', talentId: 't2', company: 'Falk & Partner', role: 'Brand Designer:in', location: 'München', status: 'review', date: '07.06.2026', next: 'In Prüfung', score: 78, attachments: [], anschreiben: true },
];

/* ---------- Stellen (saved open positions) ---------- */
const JOBS = [
  { id: 'j1', title: 'Senior C++ Engineer', company: 'Aurora Systems GmbH', location: 'Berlin · Hybrid', type: 'Vollzeit', salary: '75–90 T€', match: 92, saved: true },
  { id: 'j2', title: 'Distributed Systems Eng.', company: 'Meridian Labs', location: 'Remote (DE)', type: 'Vollzeit', salary: '80–95 T€', match: 86, saved: true },
  { id: 'j3', title: 'Backend Engineer (Rust)', company: 'Hojo Tech', location: 'Berlin', type: 'Vollzeit', salary: '70–85 T€', match: 79, saved: false },
  { id: 'j4', title: 'Plattform-Engineer', company: 'Falk & Partner', location: 'München', type: 'Vollzeit', salary: '72–88 T€', match: 83, saved: true },
];

const MESSAGES = [
  { id: 'm1', appId: 'b1', from: 'Aurora Systems · Recruiting', text: 'Gerne laden wir Sie zum Tech-Interview am 24.06. um 14:00 ein.', when: 'vor 2 Std.', unread: true },
  { id: 'm2', appId: 'b3', from: 'Falk & Partner · HR', text: 'Anbei unser Angebot. Wir würden uns über eine Rückmeldung bis 28.06. freuen.', when: 'vor 5 Std.', unread: true },
  { id: 'm3', appId: 'b8', from: 'Nordlicht Software', text: 'Das Angebot für Aylin Demir ist raus — Details im Anhang.', when: 'gestern', unread: false },
  { id: 'm4', appId: 'b2', from: 'Meridian Labs', text: 'Vielen Dank für die Unterlagen, wir melden uns diese Woche.', when: 'vor 2 Tagen', unread: false },
];

const KPIS = [
  { label: 'Aktive Bewerbungen', value: '7', delta: '+2', dir: 'up', icon: 'send' },
  { label: 'Im Interview', value: '2', delta: '+1', dir: 'up', icon: 'message' },
  { label: 'Angebote', value: '2', delta: '+1', dir: 'up', icon: 'award' },
  { label: 'Antwortquote', value: '63%', delta: '+5%', dir: 'up', icon: 'trend' },
];

/* ===== Vermittler-Seite (du betreibst die Vermittlung selbst) =====
   Kunden (Auftraggeber) → Mandate (Suchaufträge mit Provision) → Platzierungen. */
const CLIENTS = [
  { id: 'k1', name: 'Aurora Systems GmbH', industry: 'SaaS · Plattform', location: 'Berlin', since: '2024' },
  { id: 'k2', name: 'Nordlicht Software', industry: 'Fintech', location: 'Hamburg', since: '2025' },
  { id: 'k3', name: 'Falk & Partner', industry: 'Beratung', location: 'München', since: '2023' },
  { id: 'k4', name: 'Meridian Labs', industry: 'KI · Research', location: 'Remote', since: '2026' },
];

const MANDATES = [
  { id: 'ma1', clientId: 'k1', role: 'Senior C++ Engineer', location: 'Berlin · Hybrid', fee: '22%', feeValue: '17.160 €', deadline: '30.06.2026', priority: 'hoch', submitted: 4, interviews: 2, status: 'aktiv' },
  { id: 'ma2', clientId: 'k1', role: 'DevOps Engineer', location: 'Berlin', fee: '20%', feeValue: '14.000 €', deadline: '15.07.2026', priority: 'mittel', submitted: 2, interviews: 1, status: 'aktiv' },
  { id: 'ma3', clientId: 'k2', role: 'Backend Engineer', location: 'Hamburg', fee: '22%', feeValue: '16.500 €', deadline: '10.07.2026', priority: 'hoch', submitted: 3, interviews: 1, status: 'aktiv' },
  { id: 'ma4', clientId: 'k3', role: 'Plattform-Engineer', location: 'München', fee: '18%', feeValue: '12.200 €', deadline: '05.07.2026', priority: 'niedrig', submitted: 1, interviews: 0, status: 'pausiert' },
  { id: 'ma5', clientId: 'k4', role: 'Distributed Systems Eng.', location: 'Remote', fee: '24%', feeValue: '19.800 €', deadline: '20.07.2026', priority: 'mittel', submitted: 2, interviews: 1, status: 'aktiv' },
];

const PLACEMENTS = [
  { id: 'pl1', candName: 'Mara Vogel', candRole: 'Engineering Manager', client: 'Aurora Systems GmbH', start: '01.07.2026', fee: '19.000 €', status: 'In Rechnung' },
  { id: 'pl2', candName: 'Lena Brandt', candRole: 'Brand Designer', client: 'Nordlicht Software', start: '15.06.2026', fee: '12.600 €', status: 'Bezahlt' },
  { id: 'pl3', candName: 'Aylin Demir', candRole: 'UX Researcher', client: 'Meridian Labs', start: '01.08.2026', fee: '17.000 €', status: 'Probezeit' },
];

const VERMITTLER_KPIS = [
  { label: 'Aktive Mandate', value: '5', delta: '+2', dir: 'up', icon: 'briefcase' },
  { label: 'Talente im Pool', value: '4', delta: '+1', dir: 'up', icon: 'users' },
  { label: 'Platzierungen Q2', value: '7', delta: '+3', dir: 'up', icon: 'award' },
  { label: 'Provision Q2', value: '128 T€', delta: '+18%', dir: 'up', icon: 'trend' },
];

Object.assign(window, { STAGES_ORDER, STAGE_LABELS, TALENTS, APPLICATIONS, JOBS, MESSAGES, KPIS, CLIENTS, MANDATES, PLACEMENTS, VERMITTLER_KPIS });
