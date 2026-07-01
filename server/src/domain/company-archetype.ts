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
  /** Where the classification came from — a curated name or an inferred archetype. */
  source: 'curated' | 'archetype';
  confidence: 'low' | 'medium' | 'high';
  style: InterviewStyle;
}

const LABELS: Record<ArchetypeKey, string> = {
  bigtech_us: 'US Big Tech',
  deeptech_hw: 'Deep-Tech / Hardware',
  enterprise_software: 'Enterprise-Software',
  industrie_mittelstand: 'Industrie / Mittelstand',
  grosskonzern: 'Großkonzern',
  beratung: 'Unternehmensberatung',
  finance: 'Finanzen / Banking',
  startup: 'Startup',
  default: 'Allgemein',
};

const STYLES: Record<ArchetypeKey, InterviewStyle> = {
  bigtech_us: {
    formats: [
      'Algorithmische Coding-Challenges (Datenstrukturen & Algorithmen)',
      'System-Design (ab Senior-Level)',
      'Behavioral / Kulturfit',
    ],
    emphasis: ['Problemlösung unter Zeitdruck', 'Lösungsweg klar kommunizieren', 'Skalierbarkeit'],
    rounds: 'typisch 4–5 Runden, oft als Onsite-/Panel-Loop',
    tips: [
      'Algorithmen & Datenstrukturen aktiv üben (z. B. LeetCode)',
      'Beim Coden laut den Lösungsweg erklären',
      'System-Design-Grundlagen wiederholen',
    ],
  },
  deeptech_hw: {
    formats: [
      'Tiefes Domänen-Fachgespräch (z. B. GPU-, Chip-, Embedded-Themen)',
      'Coding in C++/CUDA/Verilog je nach Rolle',
      'System-/Architektur-Fragen',
    ],
    emphasis: ['Fachtiefe', 'Hardware-nahe Grundlagen', 'Performance-Bewusstsein'],
    rounds: 'typisch 3–5 Runden',
    tips: ['Domänenwissen vertiefen', 'Konkrete, technisch tiefe Projektbeispiele parat haben'],
  },
  enterprise_software: {
    formats: [
      'Fachinterview je nach Rolle (Cloud / ABAP / Consulting)',
      'Kompetenz- & Verhaltensfragen',
      'ggf. leichte Coding-/Case-Aufgabe',
    ],
    emphasis: ['Fachliche Passung', 'Kundenorientierung', 'Kulturfit'],
    rounds: 'typisch 2–4 Runden',
    tips: ['Produkt & Tech-Stack recherchieren', 'Kundenprojekte als Beispiele vorbereiten'],
  },
  industrie_mittelstand: {
    formats: [
      'Strukturiertes Fachgespräch',
      'ggf. Fachpräsentation / Technik-Case',
      'Persönlichkeits- & Kulturgespräch',
    ],
    emphasis: ['Fachliche Tiefe', 'Langfristige Passung', 'Bodenständigkeit'],
    rounds: 'typisch 2–3 Runden, oft mit Werks-/Teambesuch',
    tips: ['Konkrete Projektbeispiele', 'Echtes Interesse an Produkt & Standort zeigen'],
  },
  grosskonzern: {
    formats: [
      'Mehrstufiger, strukturierter Prozess (HR + Fachbereich)',
      'Kompetenz- & Verhaltensfragen',
      'ggf. Assessment-Center (v. a. Absolvent:innen/Trainees)',
    ],
    emphasis: ['Struktur', 'Teamfähigkeit', 'Prozessverständnis'],
    rounds: 'typisch 2–4 Stufen',
    tips: ['STAR-Beispiele vorbereiten', 'Werte & Leitlinien des Konzerns kennen'],
  },
  beratung: {
    formats: [
      'Case-Interview (strukturierte Problemlösung)',
      'Fit- / Persönlichkeits-Interview',
      'ggf. Brainteaser / Schätzfragen',
    ],
    emphasis: ['Strukturiertes Denken', 'Kommunikation', 'Hypothesengetriebenes Vorgehen'],
    rounds: 'typisch 2 Runden mit je mehreren Cases',
    tips: ['Case-Frameworks üben', 'Schätz-/Marktgrößen-Fragen trainieren'],
  },
  finance: {
    formats: [
      'Fachinterview (Finanzen / Quant)',
      'Brainteaser / Logikaufgaben',
      'Verhaltensfragen',
    ],
    emphasis: ['Genauigkeit', 'Belastbarkeit', 'Analytik'],
    rounds: 'typisch 2–4 Runden',
    tips: ['Fachbegriffe sicher beherrschen', 'Kopfrechnen & Logikaufgaben üben'],
  },
  startup: {
    formats: [
      'Pragmatische Take-Home-Aufgabe oder Pair-Programming',
      'Gespräch mit Gründer:innen',
      'Kultur- & Motivationsfit',
    ],
    emphasis: ['Hands-on-Mentalität', 'Eigeninitiative', 'Breite statt Spezialisierung'],
    rounds: 'typisch 2–3 Runden, schneller Prozess',
    tips: ['Portfolio/GitHub parat halten', '„Warum genau dieses Startup" beantworten können'],
  },
  default: {
    formats: ['Strukturiertes Fachgespräch', 'Motivations- & Kulturfit'],
    emphasis: ['Fachliche Passung', 'Motivation'],
    rounds: 'variiert je nach Arbeitgeber',
    tips: ['Stelle & Unternehmen recherchieren', 'Konkrete Beispiele nach der STAR-Methode'],
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
