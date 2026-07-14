/* Seed talent pool for myJob. Suhay Sevinc is candidate #1 with his REAL CV
   (verbatim from the source résumé) so the recruiter never re-enters it — but
   he is just a normal candidate in the list, not special-cased anywhere.
   Other candidates are lighter, realistic fillers.
   Exposed as window.MyJobTalents. */
(function () {
  const suhay = {
    id: 'me',
    name: 'Suhay Sevinc',
    photo: (function () { try { return new URL('../assets/img/suhay-photo-sm.jpg', document.currentScript.src).pathname; } catch (e) { return '../assets/img/suhay-photo-sm.jpg'; } })(),
    role: 'M.Sc. Software Engineer',
    headline: 'C++ / C#-.NET · Echtzeit- & verteilte Systeme',
    location: 'Blumberg, DE',
    workPermit: 'G — Grenzgänger Schweiz',
    available: 'sofort',
    salaryTarget: 'CHF 120–140k',
    seniority: 'Senior',
    years: 7,
    contact: {
      phone: '+49 176 91407840',
      mail: 'suhay.sevinc@gmail.com',
      address: ['Achdorfer Straße 25', '78176 Blumberg, DE'],
      linkedin: 'linkedin.com/in/suhay-sevinc',
      github: 'github.com/NexusHero',
    },
    personal: [['Nationalität', 'Deutsch'], ['Geburtsdatum', '07.05.1991'], ['Bewilligung', 'G (Grenzgänger CH)']],
    languages: [['Deutsch', 'Muttersprache'], ['Türkisch', 'Muttersprache'], ['Englisch', 'Verhandlungssicher']],
    about: 'Software Engineer (M.Sc.) mit über 7 Jahren Erfahrung und tiefgehendem Expertenwissen in der hardwarenahen, verteilten und geschäftskritischen Softwareentwicklung (C++ und C#/.NET). Erfahren in der Konzeption komplexer Systemarchitekturen, modernen DevOps-Praktiken (CI/CD) und agilen Methoden. Bewährt in technologisch anspruchsvollen und sicherheitskritischen Branchen wie der Verteidigungsindustrie und der industriellen Lasertechnik.',
    summary: [
      'Design & Entwicklung moderner C++ Echtzeitsysteme',
      'Microservices, Vernetzung & komplexe API-Integration',
      'DevOps-Praktiken, Gitflow & CI/CD',
    ],
    /* flat list used by the matcher — the headline skills first */
    skills: ['C++20', 'C# / .NET', 'Python', 'Qt / QML', 'Microservices', 'gRPC', 'Protobuf', 'OPC-UA', 'REST', 'MQTT', 'Docker', 'Clean Architecture', 'CI/CD', 'GTest'],
    skillGroups: [
      { label: 'Sprachen', strong: true, items: ['C++20', 'C# / .NET 10', 'Python'] },
      { label: 'Frameworks & Bibliotheken', items: ['Qt / QML 6', 'Boost', 'OpenCV', 'ASP.NET Core', 'NumPy', 'TensorFlow'] },
      { label: 'Architektur', items: ['Microservices', 'Clean Architecture', 'DDD', 'MVVM', 'ISAQB / Arc42'] },
      { label: 'Protokolle & APIs', items: ['gRPC', 'Protobuf', 'OPC-UA', 'REST', 'MQTT'] },
      { label: 'DevOps & Build', items: ['Docker', 'Azure DevOps', 'Jenkins', 'GitLab CI', 'Conan'] },
      { label: 'Testing & Qualität', items: ['GTest', 'GMock', 'xUnit', 'Sonarcloud'] },
    ],
    interests: ['Home Assistant', 'Raspberry Pi', 'MQTT Sensing', 'Basketball'],
    experience: [
      {
        title: 'Software Engineer', company: 'Rheinmetall Air Defence AG', location: 'Zürich (CH)',
        period: '11/2024 — heute', current: true,
        tech: ['C++20', 'QML', 'REST', 'Protobuf', 'TCP/IP', 'Boost', 'GTest'],
        bullets: [
          'Entwickelte zentrale Steuersoftware der Oerlikon Skynex® Software für Control Nodes und Feuerleitgeräte',
          'Implementierte taktische Kommunikationsprotokolle (TCP, REST, Protobuf) zur Vernetzung von Sensorsystemen, Effektoren und Simulationen',
          'Setzte QML-Oberflächen als Kernbedienoberfläche des Systems um',
          'Verantwortete Requirements Engineering inkl. Testkonzepten und Stakeholder-Abstimmung',
          'Führte Gitflow samt modernem Entwicklungsprozess (Code Reviews, automatisierte Tests) teamweit ein',
        ],
      },
      {
        title: 'Software Engineer C++ / C#', company: 'TRUMPF SE + Co. KG', location: 'Schramberg (DE)',
        period: '03/2019 — 10/2024 · 5 J. 8 M.',
        tech: ['C++17', 'C#', '.NET 8', 'Python', 'Qt', 'gRPC', 'OPC-UA', 'MQTT', 'OpenCV', 'Docker', 'Azure DevOps'],
        bullets: [
          'Visionsystem: C++-Visionsystem (Debian Realtime) weiterentwickelt, Kameraplattform für OEM-Kunden gebaut, Performance der Kameraanbindung von 60 auf 280 FPS gesteigert',
          'Quality Data Store: .NET-System zur Kundendaten-Ablage mit gRPC-Client-Server-Kommunikation entwickelt',
          'CAD/CAM-Microservice mit domänenspezifischer Sprache (LionWeb) in C# implementiert',
          'Scrum Master für ein 5-köpfiges Team; OPC-UA/gRPC-Integration entwickelt',
          'Durchgängige Softwarequalität via Gitflow, Clean Code (SOLID), CI/CD (Azure DevOps), Sonarcloud',
        ],
      },
    ],
    certs: [
      { title: 'ISAQB CPSA-Advanced-Level — Certified Professional for Software Architecture', year: '2026', progress: '1 von 3 Modulen', highlight: true },
      { title: 'ISAQB Foundation Level — Software Architecture', year: '2022' },
      { title: 'Clean Code C++17', year: '2021' },
    ],
    education: [
      { title: 'M.Sc. Informatik', school: 'Hochschule Furtwangen', period: '10/2017 — 03/2019', grade: '1.9' },
      { title: 'B.Sc. Allgemeine Informatik', school: 'Hochschule Furtwangen', period: '03/2014 — 08/2017', grade: '2.2' },
    ],
  };

  /* Other candidates — ordinary fillers so the pool is a real pool. */
  const others = [
    {
      id: 't2', name: 'Lena Bauer', role: 'Senior Frontend Engineer', headline: 'React · TypeScript · Design Systems',
      location: 'München, DE', available: 'in 2 Monaten', salaryTarget: '€ 85–95k', seniority: 'Senior', years: 6,
      skills: ['React', 'TypeScript', 'CSS Architecture', 'Vue', 'Testing', 'Node.js'],
      about: 'Frontend-Spezialistin mit Fokus auf skalierbare Design-Systeme und Performance.',
    },
    {
      id: 't3', name: 'Milan Ebert', role: 'Backend Engineer', headline: 'Go · Kubernetes · verteilte Systeme',
      location: 'Berlin, DE', available: 'sofort', salaryTarget: '€ 80–92k', seniority: 'Mid', years: 4,
      skills: ['Go', 'Kubernetes', 'PostgreSQL', 'gRPC', 'Docker', 'REST'],
      about: 'Backend-Engineer mit Schwerpunkt Cloud-native Infrastruktur.',
    },
    {
      id: 't4', name: 'Nora Vogt', role: 'Product Designer', headline: 'Produkt · Interaction · Research',
      location: 'Hamburg, DE', available: 'in 1 Monat', salaryTarget: '€ 70–82k', seniority: 'Senior', years: 7,
      skills: ['Figma', 'Design Systems', 'User Research', 'Prototyping', 'Interaction Design'],
      about: 'Produktdesignerin mit Research-Hintergrund und System-Denken.',
    },
  ];

  window.MyJobTalents = {
    me: suhay,
    all: [suhay, ...others],
    /* skill overlap between a candidate and a list of required skills */
    match: function (cand, required) {
      if (!required || !required.length) return { pct: 0, met: 0, total: 0 };
      const have = (cand.skills || []).map((s) => s.toLowerCase());
      const met = required.filter((r) => have.includes(r.toLowerCase())).length;
      return { pct: Math.round((met / required.length) * 100), met, total: required.length };
    },
  };
})();
