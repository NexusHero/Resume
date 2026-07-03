import { z } from 'zod';

/**
 * A deterministic AGG (Allgemeines Gleichbehandlungsgesetz) language check for
 * job ads and outreach text. It flags wording that risks discriminating on one
 * of the protected characteristics of §1 AGG and proposes a neutral rewrite.
 *
 * It is intentionally rule-based (a curated German lexicon), so it works
 * offline, is explainable, and never invents a verdict — a recruiter can see
 * exactly which phrase tripped which rule. It is a drafting aid, not legal
 * advice.
 */
export const AGG_CATEGORIES = [
  'alter',
  'geschlecht',
  'herkunft',
  'religion',
  'behinderung',
] as const;
export type AggCategory = (typeof AGG_CATEGORIES)[number];

export const AGG_CATEGORY_LABELS: Record<AggCategory, string> = {
  alter: 'Alter',
  geschlecht: 'Geschlecht',
  herkunft: 'Ethnische Herkunft',
  religion: 'Religion / Weltanschauung',
  behinderung: 'Behinderung',
};

type Severity = 'low' | 'medium' | 'high';

interface Rule {
  category: AggCategory;
  severity: Severity;
  re: RegExp;
  issue: string;
  suggestion: string;
  /**
   * Deterministic neutral replacement for the writing aid. `$1` etc. refer to
   * the rule's capture groups; omitted when no safe automatic rewrite exists
   * (the phrase is flagged but left for the recruiter to resolve).
   */
  replacement?: string;
}

/** The curated rule set. Each `re` is global + case-insensitive for matchAll. */
const RULES: Rule[] = [
  // --- Alter ---
  {
    category: 'alter',
    severity: 'medium',
    re: /jung\w*\s+(?:dynamisch\w*\s+)?team/gi,
    issue: 'Altersbezogene Teambeschreibung',
    suggestion: 'Kultur ohne Altersbezug beschreiben, z. B. „motiviertes Team".',
    replacement: 'motiviertes Team',
  },
  {
    category: 'alter',
    severity: 'medium',
    re: /digital natives?/gi,
    issue: 'Alterscodierter Begriff',
    suggestion: 'Konkrete Fähigkeit fordern, z. B. „sicherer Umgang mit digitalen Tools".',
    replacement: 'sicherer Umgang mit digitalen Tools',
  },
  {
    category: 'alter',
    severity: 'high',
    re: /max(?:imal)?\.?\s*\d{2}\s*jahre|\d{2}\s*(?:-|–|bis)\s*\d{2}\s*jahre/gi,
    issue: 'Konkrete Altersgrenze',
    suggestion: 'Keine Altersspanne fordern; auf die benötigte Erfahrung abstellen.',
  },
  {
    category: 'alter',
    severity: 'low',
    re: /jung(?:e|er|es)?(?=\s)/gi,
    issue: 'Möglicher Altersbezug („jung")',
    suggestion: 'Prüfen, ob „jung" nötig ist — meist besser weglassen.',
  },
  // --- Geschlecht ---
  {
    category: 'geschlecht',
    severity: 'high',
    re: /männlich[a-zäöüß]*|weiblich[a-zäöüß]*/gi,
    issue: 'Geschlecht als Anforderung',
    suggestion: 'Geschlecht nicht fordern; Stelle mit „(m/w/d)" ausschreiben.',
  },
  {
    category: 'geschlecht',
    severity: 'low',
    re: /\b(?:sekretärin|bürofräulein|putzfrau|verkäuferin)\b/gi,
    issue: 'Geschlechtsgebundene Rollenbezeichnung',
    suggestion: 'Geschlechtsneutrale Bezeichnung nutzen und „(m/w/d)" ergänzen.',
  },
  // --- Ethnische Herkunft ---
  {
    category: 'herkunft',
    severity: 'medium',
    re: /muttersprachler(?:in)?|als muttersprache|perfektes?\s+deutsch/gi,
    issue: 'Herkunftsbezogene Sprachanforderung',
    suggestion: 'Sprachniveau fordern, z. B. „verhandlungssicheres Deutsch (C1)".',
    replacement: 'verhandlungssicheres Deutsch (C1)',
  },
  {
    category: 'herkunft',
    severity: 'high',
    re: /keine?\s+ausländer|nur\s+deutsche/gi,
    issue: 'Ausschluss nach Herkunft',
    suggestion: 'Herkunft ist kein zulässiges Kriterium; entfernen.',
  },
  // --- Religion / Weltanschauung ---
  {
    category: 'religion',
    severity: 'medium',
    re: /\b(?:christlich|katholisch|evangelisch|muslimisch|konfessionell)e?r?\b/gi,
    issue: 'Religionsbezug',
    suggestion: 'Religion nur bei kirchlichen/Tendenzbetrieben zulässig (§9 AGG).',
  },
  // --- Behinderung ---
  {
    category: 'behinderung',
    severity: 'medium',
    re: /(?:körperlich\s+)?(?:voll\s+)?belastbar|ohne\s+(?:gesundheitliche\s+)?einschränkungen|körperlich\s+fit/gi,
    issue: 'Kann Menschen mit Behinderung ausschließen',
    suggestion: 'Konkrete, tätigkeitsbezogene Anforderungen statt Pauschalfitness nennen.',
    replacement: 'den tätigkeitsbezogenen Anforderungen gewachsen',
  },
];

/** A job ad already carrying a gender marker like (m/w/d) is on the safe side. */
const GENDER_MARKER = /\(\s*(?:m\/w\/d|w\/m\/d|m\/w\/i|d\/m\/w|m\/w|gn)\s*\)/i;

const SEVERITY_RANK: Record<Severity, number> = { low: 1, medium: 2, high: 3 };

export interface AggFinding {
  category: AggCategory;
  categoryLabel: string;
  severity: Severity;
  term: string; // the phrase found in the text
  issue: string;
  suggestion: string;
}

export interface AggCheckResult {
  findings: AggFinding[];
  riskLevel: 'none' | 'low' | 'medium' | 'high';
  hasGenderMarker: boolean;
  summary: string;
}

/** POST /api/v1/compliance/agg-check — the job-ad / outreach text to scan. */
export const aggCheckSchema = z.object({
  text: z.string().max(50_000).default(''),
});
export type AggCheckInput = z.infer<typeof aggCheckSchema>;

/** Scan text for AGG-risk wording and return grouped, explained findings. */
export function checkAgg(text: string): AggCheckResult {
  const findings: AggFinding[] = [];
  const seen = new Set<string>();

  for (const rule of RULES) {
    for (const match of text.matchAll(rule.re)) {
      const term = match[0].trim();
      const key = `${rule.category}:${term.toLowerCase()}`;
      if (seen.has(key)) continue;
      seen.add(key);
      findings.push({
        category: rule.category,
        categoryLabel: AGG_CATEGORY_LABELS[rule.category],
        severity: rule.severity,
        term,
        issue: rule.issue,
        suggestion: rule.suggestion,
      });
    }
  }

  const hasGenderMarker = GENDER_MARKER.test(text);
  const maxRank = findings.reduce((m, f) => Math.max(m, SEVERITY_RANK[f.severity]), 0);
  const riskLevel: AggCheckResult['riskLevel'] =
    maxRank === 3 ? 'high' : maxRank === 2 ? 'medium' : maxRank === 1 ? 'low' : 'none';

  // Sort most severe first, then by category for a stable, readable order.
  findings.sort(
    (a, b) =>
      SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity] || a.category.localeCompare(b.category),
  );

  const summary =
    findings.length === 0
      ? hasGenderMarker
        ? 'Keine auffälligen Formulierungen gefunden.'
        : 'Keine auffälligen Formulierungen — ggf. „(m/w/d)" ergänzen.'
      : `${findings.length} Hinweis${findings.length === 1 ? '' : 'e'} gefunden` +
        (hasGenderMarker ? '.' : ' — außerdem fehlt ein „(m/w/d)"-Zusatz.');

  return { findings, riskLevel, hasGenderMarker, summary };
}

export interface AggRewriteEdit {
  category: AggCategory;
  from: string;
  to: string;
}

export interface AggRewriteResult {
  /** The text with every safely-rewritable phrase replaced by a neutral one. */
  text: string;
  changed: boolean;
  edits: AggRewriteEdit[];
  /** Findings with no safe automatic rewrite — left for the recruiter to resolve. */
  unresolved: AggFinding[];
}

/**
 * The AGG writing aid: deterministically replace every flagged phrase that has
 * a safe neutral rewrite, and report the phrases that don't (an age limit or a
 * hard exclusion needs a human decision, not a mechanical swap). Rule-based, so
 * the recruiter sees exactly what changed and why — a drafting aid, not legal
 * advice.
 */
export function rewriteAgg(text: string): AggRewriteResult {
  let out = text;
  const edits: AggRewriteEdit[] = [];
  const seen = new Set<string>();
  for (const rule of RULES) {
    if (!rule.replacement) continue;
    // Snapshot the matches before mutating, so `from` reflects the original.
    for (const match of out.matchAll(rule.re)) {
      const from = match[0].trim();
      const key = `${rule.category}:${from.toLowerCase()}`;
      if (seen.has(key)) continue;
      seen.add(key);
      edits.push({ category: rule.category, from, to: rule.replacement });
    }
    out = out.replace(rule.re, rule.replacement);
  }
  // Anything still flagged after the rewrite has no safe automatic fix.
  const unresolved = checkAgg(out).findings;
  return { text: out, changed: out !== text, edits, unresolved };
}
