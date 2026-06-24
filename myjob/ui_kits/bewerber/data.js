/* __kit_guard__ */
(function(){ if (!window.__MYJOB_KIT_READY) return;
/* Bewerber-side sample data — the applicant's own applications (myJob für Bewerber). */
const ME = { name: 'Suhay Sevinc', role: 'M.Sc. Software Engineer', src: '../../assets/img/candidate-portrait-sm.jpg', location: 'Berlin' };

/* status reuses the pipeline keys so StatusBadge labels match */
const APPLICATIONS = [
  { id: 'a1', firma: 'Aurora Systems GmbH', stelle: 'Senior C++ Engineer', ort: 'Berlin', date: '12.06.2026', status: 'interview', next: 'Tech-Interview · 24.06.', docs: 3 },
  { id: 'a2', firma: 'Nordlicht Software', stelle: 'Backend Engineer', ort: 'Hamburg', date: '09.06.2026', status: 'review', next: 'In Sichtung', docs: 3 },
  { id: 'a3', firma: 'Falk & Partner', stelle: 'Plattform-Engineer', ort: 'München', date: '05.06.2026', status: 'offer', next: 'Angebot erhalten', docs: 4 },
  { id: 'a4', firma: 'Meridian Labs', stelle: 'Distributed Systems Eng.', ort: 'Remote', date: '02.06.2026', status: 'new', next: 'Eingereicht', docs: 3 },
  { id: 'a5', firma: 'Hansa Digital', stelle: 'C++ Tech Lead', ort: 'Bremen', date: '28.05.2026', status: 'rejected', next: 'Leider abgesagt', docs: 3 },
];

const DOCS = [
  { id: 'd1', name: 'Lebenslauf', tag: 'CV', sub: 'Aktualisiert · 1 Seite', pinned: true },
  { id: 'd2', name: 'Anschreiben', tag: 'Letter', sub: 'Pro Stelle angepasst', pinned: true },
  { id: 'd3', name: 'Arbeitszeugnis — Aurora', tag: 'PDF', sub: '2 Seiten' },
  { id: 'd4', name: 'M.Sc. Zeugnis', tag: 'PDF', sub: '1 Seite' },
  { id: 'd5', name: 'Zertifikat — Kubernetes', tag: 'PDF', sub: '1 Seite' },
];

Object.assign(window, { ME, APPLICATIONS, DOCS });

})();
