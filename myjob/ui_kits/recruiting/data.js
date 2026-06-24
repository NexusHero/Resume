/* __kit_guard__ */
(function(){ var __s=document.currentScript; if (__s && /_ds_bundle\.js/.test(__s.src||'')) return;
/* Sample recruiting data for the myJob ATS UI kit. German, realistic. */
const STAGES_ORDER = ['new', 'review', 'interview', 'offer', 'hired'];
const STAGE_LABELS = { new: 'Neu', review: 'Sichtung', interview: 'Interview', offer: 'Angebot', hired: 'Eingestellt', rejected: 'Absage' };

const JOBS = [
  { id: 'j1', title: 'Senior C++ Engineer', team: 'Plattform · Backend', location: 'Berlin · Hybrid', open: 24, type: 'Vollzeit' },
  { id: 'j2', title: 'Product Designer:in', team: 'Design · UX', location: 'Remote (DE)', open: 31, type: 'Vollzeit' },
  { id: 'j3', title: 'DevOps Engineer', team: 'Infrastructure', location: 'München · Vor Ort', open: 12, type: 'Vollzeit' },
  { id: 'j4', title: 'Werkstudent:in Data', team: 'Analytics', location: 'Hamburg · Hybrid', open: 9, type: 'Werkstudent' },
];

const CANDIDATES = [
  {
    id: 'c1', name: 'Suhay Sevinc', role: 'M.Sc. Software Engineer', position: 'Senior C++ Engineer', jobId: 'j1',
    src: '../../assets/img/candidate-portrait-sm.jpg', status: 'interview', score: 88, when: '2 Tage', source: 'LinkedIn',
    location: 'Berlin', email: 'suhay.sevinc@example.de', phone: '+49 151 2345 6789', salary: '78.000 €', notice: '3 Monate',
    skills: ['C++', 'Rust', 'Distributed Systems', 'gRPC', 'Kubernetes', 'CMake'],
    summary: 'Backend-Engineer mit 6 Jahren Erfahrung in hochperformanten verteilten Systemen. Zuletzt Tech-Lead eines Matching-Teams.',
    timeline: [
      { t: 'Beworben', d: '12.06.2026', who: 'via LinkedIn' },
      { t: 'In Sichtung verschoben', d: '13.06.2026', who: 'Petra Voss (HR)' },
      { t: 'Telefon-Screening', d: '16.06.2026', who: 'Petra Voss' },
      { t: 'Tech-Interview geplant', d: '24.06.2026', who: 'Plattform-Team' },
    ],
  },
  { id: 'c2', name: 'Lena Brandt', role: 'Product Designerin', position: 'Product Designer:in', jobId: 'j2', status: 'review', score: 81, when: '4 Tage', source: 'Empfehlung', location: 'Leipzig', email: 'lena.brandt@example.de', phone: '+49 160 1112 2334', salary: '64.000 €', notice: '6 Wochen', skills: ['Figma', 'Design Systems', 'Prototyping', 'User Research'], summary: 'Produktdesignerin mit Fokus auf B2B-SaaS und Design-Systeme.' },
  { id: 'c3', name: 'Marco Adler', role: 'DevOps Engineer', position: 'DevOps Engineer', jobId: 'j3', status: 'new', score: 64, when: 'heute', source: 'Stellenportal', location: 'München', email: 'marco.adler@example.de', phone: '+49 170 5566 7788', salary: '72.000 €', notice: '3 Monate', skills: ['Terraform', 'AWS', 'CI/CD', 'Go'], summary: 'Plattform- und DevOps-Engineer mit Schwerpunkt Automatisierung.' },
  { id: 'c4', name: 'Petra Nowak', role: 'Frontend Engineer', position: 'Senior C++ Engineer', jobId: 'j1', status: 'new', score: 58, when: 'heute', source: 'Stellenportal', location: 'Wien', email: 'petra.nowak@example.at', phone: '+43 660 1234 567', salary: '60.000 €', notice: '1 Monat', skills: ['TypeScript', 'React', 'WebGL'], summary: 'Frontend-Engineer mit Interesse an systemnaher Entwicklung.' },
  { id: 'c5', name: 'Jonas Krüger', role: 'Senior Backend Engineer', position: 'Senior C++ Engineer', jobId: 'j1', status: 'review', score: 79, when: '3 Tage', source: 'LinkedIn', location: 'Köln', email: 'jonas.krueger@example.de', phone: '+49 152 9988 7766', salary: '82.000 €', notice: '3 Monate', skills: ['C++', 'Go', 'PostgreSQL', 'Kafka'], summary: 'Erfahrener Backend-Engineer aus dem Fintech-Umfeld.' },
  { id: 'c6', name: 'Aylin Demir', role: 'UX Researcher', position: 'Product Designer:in', jobId: 'j2', status: 'interview', score: 84, when: '1 Tag', source: 'Empfehlung', location: 'Berlin', email: 'aylin.demir@example.de', phone: '+49 151 4433 2211', salary: '66.000 €', notice: '2 Monate', skills: ['User Research', 'Interviews', 'Figma', 'Survey'], summary: 'UX-Researcherin mit starkem qualitativen Hintergrund.' },
  { id: 'c7', name: 'Tobias Frank', role: 'Cloud Engineer', position: 'DevOps Engineer', jobId: 'j3', status: 'offer', score: 90, when: '5 Tage', source: 'LinkedIn', location: 'Stuttgart', email: 'tobias.frank@example.de', phone: '+49 162 1010 2020', salary: '85.000 €', notice: '3 Monate', skills: ['AWS', 'Kubernetes', 'Terraform', 'Python'], summary: 'Cloud-Engineer mit Architektur-Erfahrung über mehrere Teams.' },
  { id: 'c8', name: 'Sophie Lehmann', role: 'Junior Designer', position: 'Product Designer:in', jobId: 'j2', status: 'new', score: 52, when: 'gestern', source: 'Stellenportal', location: 'Hamburg', email: 'sophie.lehmann@example.de', phone: '+49 159 3030 4040', salary: '48.000 €', notice: 'sofort', skills: ['Figma', 'Illustration'], summary: 'Junior-Designerin mit starkem Portfolio.' },
  { id: 'c9', name: 'Daniel Roth', role: 'Data Analyst', position: 'Werkstudent:in Data', jobId: 'j4', status: 'review', score: 71, when: '6 Tage', source: 'Uni-Portal', location: 'Hamburg', email: 'daniel.roth@example.de', phone: '+49 151 7070 8080', salary: '—', notice: 'flexibel', skills: ['Python', 'SQL', 'Pandas'], summary: 'Werkstudent mit Schwerpunkt Datenanalyse.' },
  { id: 'c10', name: 'Mara Vogel', role: 'Engineering Manager', position: 'Senior C++ Engineer', jobId: 'j1', status: 'hired', score: 92, when: '8 Tage', source: 'Empfehlung', location: 'Berlin', email: 'mara.vogel@example.de', phone: '+49 151 6060 5050', salary: '95.000 €', notice: '—', skills: ['C++', 'Leadership', 'Architecture'], summary: 'Engineering-Managerin, Zusage erhalten und angenommen.' },
  { id: 'c11', name: 'Felix Wagner', role: 'SRE', position: 'DevOps Engineer', jobId: 'j3', status: 'interview', score: 77, when: '2 Tage', source: 'LinkedIn', location: 'München', email: 'felix.wagner@example.de', phone: '+49 170 2323 4545', salary: '80.000 €', notice: '3 Monate', skills: ['SRE', 'Prometheus', 'Go', 'Linux'], summary: 'Site-Reliability-Engineer mit Observability-Fokus.' },
  { id: 'c12', name: 'Hanna Schulz', role: 'Brand Designer', position: 'Product Designer:in', jobId: 'j2', status: 'offer', score: 86, when: '4 Tage', source: 'Empfehlung', location: 'Berlin', email: 'hanna.schulz@example.de', phone: '+49 151 1212 3434', salary: '70.000 €', notice: '6 Wochen', skills: ['Branding', 'Figma', 'Motion'], summary: 'Brand-Designerin mit Schnittstelle zu Produkt.' },
];

const KPIS = [
  { label: 'Neue Bewerbungen', value: '48', delta: '+12%', dir: 'up', icon: 'inbox' },
  { label: 'Im Interview', value: '14', delta: '+3', dir: 'up', icon: 'users' },
  { label: 'Offene Stellen', value: '7', delta: '+1', dir: 'up', icon: 'briefcase' },
  { label: 'Time-to-Hire', value: '21 T', delta: '-3 T', dir: 'down', icon: 'clock' },
];

/* ===== Vermittler-Seite (Agentur "TalentBridge") =====
   The agency works mandates for several CLIENT companies, runs a shared
   candidate POOL, and books PLACEMENTS that earn a Provision (fee). */
const CLIENTS = [
  { id: 'k1', name: 'Aurora Systems GmbH', industry: 'SaaS · Plattform', location: 'Berlin', since: '2024' },
  { id: 'k2', name: 'Nordlicht Software', industry: 'Fintech', location: 'Hamburg', since: '2025' },
  { id: 'k3', name: 'Falk & Partner', industry: 'Beratung', location: 'München', since: '2023' },
  { id: 'k4', name: 'Meridian Labs', industry: 'KI · Research', location: 'Remote', since: '2026' },
];

const MANDATES = [
  { id: 'm1', clientId: 'k1', role: 'Senior C++ Engineer', location: 'Berlin · Hybrid', fee: '22%', feeValue: '17.160 €', deadline: '30.06.2026', priority: 'hoch', submitted: 4, interviews: 2, status: 'aktiv' },
  { id: 'm2', clientId: 'k1', role: 'DevOps Engineer', location: 'Berlin', fee: '20%', feeValue: '14.000 €', deadline: '15.07.2026', priority: 'mittel', submitted: 2, interviews: 1, status: 'aktiv' },
  { id: 'm3', clientId: 'k2', role: 'Backend Engineer', location: 'Hamburg', fee: '22%', feeValue: '16.500 €', deadline: '10.07.2026', priority: 'hoch', submitted: 3, interviews: 1, status: 'aktiv' },
  { id: 'm4', clientId: 'k3', role: 'Plattform-Engineer', location: 'München', fee: '18%', feeValue: '12.200 €', deadline: '05.07.2026', priority: 'niedrig', submitted: 1, interviews: 0, status: 'pausiert' },
  { id: 'm5', clientId: 'k4', role: 'Distributed Systems Eng.', location: 'Remote', fee: '24%', feeValue: '19.800 €', deadline: '20.07.2026', priority: 'mittel', submitted: 2, interviews: 1, status: 'aktiv' },
];

/* agency view of candidates: who's available + which clients they're submitted to */
const POOL = [
  { id: 'c1', availability: 'sofort', rate: '650 €/Tag', submittedTo: ['Aurora Systems', 'Meridian Labs'] },
  { id: 'c5', availability: 'in 3 Mon.', rate: '—', submittedTo: ['Aurora Systems'] },
  { id: 'c11', availability: 'sofort', rate: '—', submittedTo: ['Aurora Systems', 'Falk & Partner'] },
  { id: 'c3', availability: 'in 3 Mon.', rate: '—', submittedTo: ['Aurora Systems'] },
  { id: 'c7', availability: 'in 1 Mon.', rate: '—', submittedTo: ['Meridian Labs'] },
  { id: 'c6', availability: 'sofort', rate: '—', submittedTo: ['Nordlicht Software'] },
  { id: 'c2', availability: 'in 6 Wo.', rate: '—', submittedTo: ['Nordlicht Software'] },
];

const PLACEMENTS = [
  { id: 'p1', candId: 'c10', client: 'Aurora Systems GmbH', role: 'Engineering Manager', start: '01.07.2026', fee: '19.000 €', status: 'In Rechnung' },
  { id: 'p2', candId: 'c12', client: 'Nordlicht Software', role: 'Brand Designer', start: '15.06.2026', fee: '12.600 €', status: 'Bezahlt' },
  { id: 'p3', candId: 'c7', client: 'Meridian Labs', role: 'Cloud Engineer', start: '01.08.2026', fee: '17.000 €', status: 'Probezeit' },
];

const VERMITTLER_KPIS = [
  { label: 'Aktive Mandate', value: '5', delta: '+2', dir: 'up', icon: 'briefcase' },
  { label: 'Im Talent-Pool', value: '42', delta: '+6', dir: 'up', icon: 'users' },
  { label: 'Platzierungen Q2', value: '7', delta: '+3', dir: 'up', icon: 'award' },
  { label: 'Provision Q2', value: '128 T€', delta: '+18%', dir: 'up', icon: 'trend' },
];

Object.assign(window, { STAGES_ORDER, STAGE_LABELS, JOBS, CANDIDATES, KPIS, CLIENTS, MANDATES, POOL, PLACEMENTS, VERMITTLER_KPIS });

})();
