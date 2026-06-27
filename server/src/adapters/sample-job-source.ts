import type { Job, JobQuery } from '../domain/job';
import type { JobSource } from '../ports/job-source';

/**
 * Offline job source — a curated, deterministic list so the two-tier search
 * works without any external API or key. Production adapters (Adzuna, Arbeitnow,
 * Bundesagentur, StepStone…) implement the same JobSource port and replace this.
 */
const SAMPLE_JOBS: Job[] = [
  {
    id: 'j1',
    company: 'Celonis',
    role: 'Senior C++ Engineer',
    city: 'München',
    country: 'Deutschland',
    mode: 'hybrid',
    salary: '85.000 – 98.000 €',
    posted: 'vor 2 Tagen',
    skills: ['C++', 'gRPC', 'Distributed Systems'],
    snippet: 'Kerngeschäftslogik der Process-Mining-Engine in modernem C++20.',
    source: 'Adzuna',
  },
  {
    id: 'j2',
    company: 'GitLab',
    role: 'Backend Engineer (Rust)',
    city: 'Remote',
    country: 'Remote · EU',
    mode: 'remote',
    salary: '80.000 – 95.000 €',
    posted: 'vor 4 Tagen',
    skills: ['Rust', 'PostgreSQL', 'Remote'],
    snippet: 'Vollständig remote, asynchrone Kultur, Open-Source-Codebasis.',
    source: 'Arbeitnow',
  },
  {
    id: 'j3',
    company: 'Bitpanda',
    role: 'Platform Engineer',
    city: 'Wien',
    country: 'Österreich',
    mode: 'hybrid',
    salary: '70.000 – 88.000 €',
    posted: 'vor 1 Tag',
    skills: ['Kubernetes', 'Go', 'AWS'],
    snippet: 'Skalierung der Trading-Plattform für Millionen Nutzer:innen.',
    source: 'Adzuna',
  },
  {
    id: 'j4',
    company: 'Zalando',
    role: 'Senior Software Engineer',
    city: 'Berlin',
    country: 'Deutschland',
    mode: 'remote',
    salary: '82.000 – 96.000 €',
    posted: 'vor 6 Tagen',
    skills: ['Scala', 'Kafka', 'Microservices'],
    snippet: 'Event-getriebene Services im Fashion-Commerce-Backend.',
    source: 'Arbeitnow',
  },
  {
    id: 'j5',
    company: 'Frequenz',
    role: 'Distributed Systems Engineer',
    city: 'Berlin',
    country: 'Deutschland',
    mode: 'hybrid',
    salary: '78.000 – 92.000 €',
    posted: 'vor 3 Tagen',
    skills: ['Rust', 'gRPC', 'Energy'],
    snippet: 'Echtzeit-Steuerung dezentraler Energienetze.',
    source: 'Adzuna',
  },
  {
    id: 'j6',
    company: 'Proton',
    role: 'C++ Software Engineer',
    city: 'Zürich',
    country: 'Schweiz',
    mode: 'vor Ort',
    salary: 'CHF 120k – 140k',
    posted: 'vor 5 Tagen',
    skills: ['C++', 'Cryptography', 'Privacy'],
    snippet: 'Sichere, quelloffene Produkte für Millionen von Nutzer:innen.',
    source: 'Arbeitnow',
  },
  {
    id: 'j7',
    company: 'N26',
    role: 'Backend Engineer',
    city: 'Berlin',
    country: 'Deutschland',
    mode: 'hybrid',
    salary: '75.000 – 90.000 €',
    posted: 'vor 8 Tagen',
    skills: ['Java', 'Spring', 'Fintech'],
    snippet: 'Bezahl- und Konto-Services der mobilen Bank.',
    source: 'Adzuna',
  },
  {
    id: 'j8',
    company: 'Dynatrace',
    role: 'Senior Backend Engineer',
    city: 'Linz',
    country: 'Österreich',
    mode: 'hybrid',
    salary: '72.000 – 89.000 €',
    posted: 'vor 2 Tagen',
    skills: ['Java', 'Observability', 'Cloud'],
    snippet: 'Observability-Plattform für große Cloud-Umgebungen.',
    source: 'Arbeitnow',
  },
  {
    id: 'j9',
    company: 'Siemens',
    role: 'Cloud Software Engineer',
    city: 'Hamburg',
    country: 'Deutschland',
    mode: 'hybrid',
    salary: '74.000 – 88.000 €',
    posted: 'vor 7 Tagen',
    skills: ['Azure', 'C#', 'IoT'],
    snippet: 'Industrielle IoT-Lösungen in der Cloud.',
    source: 'Adzuna',
  },
];

export class SampleJobSource implements JobSource {
  readonly name = 'Sample';

  async search(query: JobQuery): Promise<Job[]> {
    const country = query.country?.trim();
    const city = query.city?.trim().toLowerCase();
    const kw = query.q?.trim().toLowerCase();

    return SAMPLE_JOBS.filter((job) => {
      if (country && country !== 'Alle Länder' && job.country !== country) return false;
      if (city && !job.city.toLowerCase().includes(city)) return false;
      if (kw) {
        const hay = `${job.role} ${job.company} ${job.skills.join(' ')}`.toLowerCase();
        if (!hay.includes(kw)) return false;
      }
      return true;
    }).map((job) => ({ ...job, skills: [...job.skills] }));
  }
}
