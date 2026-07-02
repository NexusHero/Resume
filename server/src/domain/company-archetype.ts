/**
 * Company interview-style archetypes — the "Art und Weise" layer, grounded so
 * the LLM never has to recall (and hallucinate) a company's process.
 *
 * We classify a company into an archetype and hand the LLM a curated, auditable
 * interview *style* (formats + emphasis + prep tips). Specifics for the few
 * hundred big names come from a curated overlay (publicly, stably documented);
 * everything else gets the style for its industry × role family. We never claim
 * volatile specifics (exact rounds, current questions) as fact — those carry a
 * confidence/source label so the recruiter can verify.
 */

export type ArchetypeKey =
  | 'bigtech_us'
  | 'deeptech_hw'
  | 'enterprise_software'
  | 'industrie_mittelstand'
  | 'grosskonzern'
  | 'beratung'
  | 'finance'
  | 'startup'
  | 'default';

export interface InterviewStyle {
  formats: string[]; // the kinds of interviews to expect
  emphasis: string[]; // what this employer type weights
  rounds: string; // a hedged, typical shape — not a fact
  tips: string[]; // how the candidate prepares
}

export interface CompanyProfile {
  archetype: ArchetypeKey;
  label: string;
  /** Where the classification came from — real observations, a curated name, or an inferred archetype. */
  source: 'observed' | 'curated' | 'archetype';
  confidence: 'low' | 'medium' | 'high';
  style: InterviewStyle;
}

const LABELS: Record<ArchetypeKey, string> = {
  bigtech_us: 'US Big Tech',
  deeptech_hw: 'Deep-Tech / Hardware',
  enterprise_software: 'Enterprise Software',
  industrie_mittelstand: 'Industry / Mid-market',
  grosskonzern: 'Large corporation',
  beratung: 'Management consulting',
  finance: 'Finance / Banking',
  startup: 'Startup',
  default: 'General',
};

const STYLES: Record<ArchetypeKey, InterviewStyle> = {
  bigtech_us: {
    formats: [
      'Algorithmic coding challenges (data structures & algorithms)',
      'System design (from senior level)',
      'Behavioral / culture fit',
    ],
    emphasis: [
      'Problem-solving under time pressure',
      'Clearly communicating your approach',
      'Scalability',
    ],
    rounds: 'typically 4–5 rounds, often as an onsite/panel loop',
    tips: [
      'Actively practice algorithms & data structures (e.g. LeetCode)',
      'Explain your approach out loud while coding',
      'Review system design fundamentals',
    ],
  },
  deeptech_hw: {
    formats: [
      'In-depth domain technical interview (e.g. GPU, chip, embedded topics)',
      'Coding in C++/CUDA/Verilog depending on the role',
      'System / architecture questions',
    ],
    emphasis: ['Technical depth', 'Hardware-level fundamentals', 'Performance awareness'],
    rounds: 'typically 3–5 rounds',
    tips: [
      'Deepen your domain knowledge',
      'Have concrete, technically deep project examples ready',
    ],
  },
  enterprise_software: {
    formats: [
      'Technical interview depending on the role (Cloud / ABAP / Consulting)',
      'Competency & behavioral questions',
      'possibly a light coding / case task',
    ],
    emphasis: ['Technical fit', 'Customer focus', 'Culture fit'],
    rounds: 'typically 2–4 rounds',
    tips: ['Research the product & tech stack', 'Prepare customer projects as examples'],
  },
  industrie_mittelstand: {
    formats: [
      'Structured technical interview',
      'possibly a technical presentation / engineering case',
      'Personality & culture conversation',
    ],
    emphasis: ['Technical depth', 'Long-term fit', 'Down-to-earth attitude'],
    rounds: 'typically 2–3 rounds, often with a site/team visit',
    tips: ['Concrete project examples', 'Show genuine interest in the product & location'],
  },
  grosskonzern: {
    formats: [
      'Multi-stage, structured process (HR + department)',
      'Competency & behavioral questions',
      'possibly an assessment center (especially graduates/trainees)',
    ],
    emphasis: ['Structure', 'Teamwork', 'Process understanding'],
    rounds: 'typically 2–4 stages',
    tips: ['Prepare STAR examples', "Know the corporation's values & guidelines"],
  },
  beratung: {
    formats: [
      'Case interview (structured problem-solving)',
      'Fit / personality interview',
      'possibly brainteasers / estimation questions',
    ],
    emphasis: ['Structured thinking', 'Communication', 'Hypothesis-driven approach'],
    rounds: 'typically 2 rounds, each with several cases',
    tips: ['Practice case frameworks', 'Train estimation / market-sizing questions'],
  },
  finance: {
    formats: [
      'Technical interview (finance / quant)',
      'Brainteasers / logic puzzles',
      'Behavioral questions',
    ],
    emphasis: ['Accuracy', 'Resilience', 'Analytical skills'],
    rounds: 'typically 2–4 rounds',
    tips: ['Master the technical terminology', 'Practice mental math & logic puzzles'],
  },
  startup: {
    formats: [
      'Pragmatic take-home task or pair programming',
      'Conversation with the founders',
      'Culture & motivation fit',
    ],
    emphasis: ['Hands-on mentality', 'Initiative', 'Breadth over specialization'],
    rounds: 'typically 2–3 rounds, fast process',
    tips: [
      'Keep your portfolio/GitHub ready',
      'Be able to answer "why this startup in particular"',
    ],
  },
  default: {
    formats: ['Structured technical interview', 'Motivation & culture fit'],
    emphasis: ['Technical fit', 'Motivation'],
    rounds: 'varies by employer',
    tips: ['Research the role & company', 'Concrete examples using the STAR method'],
  },
};

/** Curated overlay: well-known employers → archetype (matched as a substring). */
const CURATED: { match: string[]; key: ArchetypeKey }[] = [
  {
    match: ['google', 'alphabet', 'meta', 'facebook', 'amazon', 'microsoft', 'apple', 'netflix'],
    key: 'bigtech_us',
  },
  { match: ['nvidia', 'intel', 'amd', 'qualcomm', 'infineon', 'arm '], key: 'deeptech_hw' },
  {
    match: ['sap', 'oracle', 'salesforce', 'servicenow', 'datev', 'software ag'],
    key: 'enterprise_software',
  },
  {
    match: ['trumpf', 'festo', 'zeiss', 'karl storz', 'storz', 'sick', 'wago', 'stihl', 'kärcher'],
    key: 'industrie_mittelstand',
  },
  {
    match: [
      'mercedes',
      'daimler',
      'bmw',
      'volkswagen',
      'audi',
      'porsche',
      'bosch',
      'siemens',
      'continental',
      'thyssen',
    ],
    key: 'grosskonzern',
  },
  {
    match: [
      'mckinsey',
      'boston consulting',
      'bcg',
      'bain',
      'roland berger',
      'accenture',
      'deloitte',
      'kpmg',
      'capgemini',
    ],
    key: 'beratung',
  },
  {
    match: [
      'goldman',
      'morgan stanley',
      'deutsche bank',
      'jpmorgan',
      'jp morgan',
      'allianz',
      'blackrock',
      'commerzbank',
    ],
    key: 'finance',
  },
];

/** Industry cues inferred from free text when no curated name matches. */
const INDUSTRY_CUES: { re: RegExp; key: ArchetypeKey }[] = [
  { re: /beratung|consult|wirtschaftspr|case study/i, key: 'beratung' },
  { re: /\bbank\b|versicherung|finanz|fintech|asset management|quant/i, key: 'finance' },
  { re: /start-?up|gründer|seed|series [abc]/i, key: 'startup' },
  {
    re: /maschinenbau|fertigung|produktion|automotive|industrie|werk\b/i,
    key: 'industrie_mittelstand',
  },
];

function normalize(s: string): string {
  return (s || '').toLowerCase();
}

/**
 * Classify a company into an interview-style archetype from its name, the role,
 * and the job ad. Curated names win (high confidence); otherwise industry cues
 * (medium); otherwise the generic default (low).
 */
export function companyInterviewProfile(
  client: string,
  role: string,
  jobText = '',
): CompanyProfile {
  const name = normalize(client);
  for (const entry of CURATED) {
    if (entry.match.some((m) => name.includes(m))) {
      return profile(entry.key, 'curated', 'high');
    }
  }
  const haystack = `${normalize(role)} ${normalize(jobText)} ${name}`;
  for (const cue of INDUSTRY_CUES) {
    if (cue.re.test(haystack)) return profile(cue.key, 'archetype', 'medium');
  }
  return profile('default', 'archetype', 'low');
}

function profile(
  archetype: ArchetypeKey,
  source: CompanyProfile['source'],
  confidence: CompanyProfile['confidence'],
): CompanyProfile {
  return { archetype, label: LABELS[archetype], source, confidence, style: STYLES[archetype] };
}
