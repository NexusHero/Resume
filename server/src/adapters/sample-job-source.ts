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
    city: 'Munich',
    country: 'Germany',
    mode: 'hybrid',
    salary: '€85,000 – 98,000',
    posted: '2 days ago',
    skills: ['C++', 'gRPC', 'Distributed Systems'],
    snippet: 'Core business logic of the process-mining engine in modern C++20.',
    source: 'Adzuna',
  },
  {
    id: 'j2',
    company: 'GitLab',
    role: 'Backend Engineer (Rust)',
    city: 'Remote',
    country: 'Remote · EU',
    mode: 'remote',
    salary: '€80,000 – 95,000',
    posted: '4 days ago',
    skills: ['Rust', 'PostgreSQL', 'Remote'],
    snippet: 'Fully remote, async culture, open-source codebase.',
    source: 'Arbeitnow',
  },
  {
    id: 'j3',
    company: 'Bitpanda',
    role: 'Platform Engineer',
    city: 'Vienna',
    country: 'Austria',
    mode: 'hybrid',
    salary: '€70,000 – 88,000',
    posted: '1 day ago',
    skills: ['Kubernetes', 'Go', 'AWS'],
    snippet: 'Scaling the trading platform for millions of users.',
    source: 'Adzuna',
  },
  {
    id: 'j4',
    company: 'Zalando',
    role: 'Senior Software Engineer',
    city: 'Berlin',
    country: 'Germany',
    mode: 'remote',
    salary: '€82,000 – 96,000',
    posted: '6 days ago',
    skills: ['Scala', 'Kafka', 'Microservices'],
    snippet: 'Event-driven services in the fashion-commerce backend.',
    source: 'Arbeitnow',
  },
  {
    id: 'j5',
    company: 'Frequenz',
    role: 'Distributed Systems Engineer',
    city: 'Berlin',
    country: 'Germany',
    mode: 'hybrid',
    salary: '€78,000 – 92,000',
    posted: '3 days ago',
    skills: ['Rust', 'gRPC', 'Energy'],
    snippet: 'Real-time control of decentralized energy grids.',
    source: 'Adzuna',
  },
  {
    id: 'j6',
    company: 'Proton',
    role: 'C++ Software Engineer',
    city: 'Zurich',
    country: 'Switzerland',
    mode: 'on-site',
    salary: 'CHF 120k – 140k',
    posted: '5 days ago',
    skills: ['C++', 'Cryptography', 'Privacy'],
    snippet: 'Secure, open-source products for millions of users.',
    source: 'Arbeitnow',
  },
  {
    id: 'j7',
    company: 'N26',
    role: 'Backend Engineer',
    city: 'Berlin',
    country: 'Germany',
    mode: 'hybrid',
    salary: '€75,000 – 90,000',
    posted: '8 days ago',
    skills: ['Java', 'Spring', 'Fintech'],
    snippet: 'Payment and account services of the mobile bank.',
    source: 'Adzuna',
  },
  {
    id: 'j8',
    company: 'Dynatrace',
    role: 'Senior Backend Engineer',
    city: 'Linz',
    country: 'Austria',
    mode: 'hybrid',
    salary: '€72,000 – 89,000',
    posted: '2 days ago',
    skills: ['Java', 'Observability', 'Cloud'],
    snippet: 'Observability platform for large cloud environments.',
    source: 'Arbeitnow',
  },
  {
    id: 'j9',
    company: 'Siemens',
    role: 'Cloud Software Engineer',
    city: 'Hamburg',
    country: 'Germany',
    mode: 'hybrid',
    salary: '€74,000 – 88,000',
    posted: '7 days ago',
    skills: ['Azure', 'C#', 'IoT'],
    snippet: 'Industrial IoT solutions in the cloud.',
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
      if (country && country !== 'All countries' && job.country !== country) return false;
      if (city && !job.city.toLowerCase().includes(city)) return false;
      if (kw) {
        const hay = `${job.role} ${job.company} ${job.skills.join(' ')}`.toLowerCase();
        if (!hay.includes(kw)) return false;
      }
      return true;
    }).map((job) => ({ ...job, skills: [...job.skills] }));
  }
}
