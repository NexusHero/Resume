import { z } from 'zod';
import type { TalentDocuments } from './talent-documents';

/** POST /api/v1/talents/:id/documents/ats */
export const atsRequestSchema = z.object({
  jobText: z.string().min(1, 'jobText is required').max(50_000),
});

/** A résumé-vs-job match analysis. */
export interface AtsScore {
  score: number; // 0–100 match rate
  matched: string[]; // job keywords the candidate already shows
  missing: string[]; // job keywords the candidate lacks / should add
  suggestions: string[]; // concrete résumé edits
}

/** The shape the LLM must return; validated leniently, score clamped. */
export const atsResultSchema = z.object({
  score: z.number(),
  matched: z.array(z.string()).default([]),
  missing: z.array(z.string()).default([]),
  suggestions: z.array(z.string()).default([]),
});

export function atsPrompt(
  documents: TalentDocuments,
  jobText: string,
): { system: string; prompt: string } {
  const skills = documents.resume.skillGroups.flatMap((g) => g.items);
  const roles = documents.resume.experience.map((e) => e.role).filter(Boolean);
  return {
    system:
      'You are an ATS analyst. Compare the candidate profile with the job ad and ' +
      'return ONLY valid JSON (no explanation, no markdown fences): ' +
      '{"score":0,"matched":[""],"missing":[""],"suggestions":[""]}. ' +
      'score is a number 0–100 (match rate). matched = key terms from the ad that the ' +
      'candidate meets. missing = important terms from the ad that are absent. suggestions = ' +
      'concrete, actionable improvements to the résumé. Do not invent skills.',
    prompt: `Candidate:\nRole(s): ${roles.join(', ') || '—'}\nSkills: ${
      skills.join(', ') || '—'
    }\nSummary: ${documents.resume.summary || '—'}\n\nJob ad:\n"""\n${jobText}\n"""`,
  };
}

export function tokenize(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .split(/[^a-zäöüß0-9+#.]+/)
      // keep internal dots (.NET, node.js) but drop trailing sentence dots
      .map((t) => t.replace(/\.+$/, '').trim())
      .filter((t) => t.length >= 3),
  );
}

/**
 * Deterministic fallback (no LLM): how many of the candidate's stated skills the
 * job mentions. A coarse proxy — the LLM path is the real analysis — but it
 * always returns a usable, honest score.
 */
export function fallbackAts(documents: TalentDocuments, jobText: string): AtsScore {
  const skills = [
    ...documents.resume.skillGroups.flatMap((g) => g.items),
    ...documents.resume.experience.flatMap((e) => e.skills),
  ]
    .map((s) => s.trim())
    .filter(Boolean);
  const jobTokens = tokenize(jobText);
  const unique = [...new Set(skills.map((s) => s.toLowerCase()))];
  const matched = unique.filter(
    (s) => jobTokens.has(s) || [...jobTokens].some((t) => s.includes(t)),
  );
  const score = unique.length ? Math.round((matched.length / unique.length) * 100) : 0;
  const matchedLabels = skills.filter((s) => matched.includes(s.toLowerCase()));
  return {
    score,
    matched: [...new Set(matchedLabels)],
    missing: [],
    suggestions: [
      "Mirror the job ad's key terms verbatim in your summary and experience.",
      'Back core competencies with measurable results (numbers, impact).',
    ],
  };
}

/** Clamp/repair an LLM-produced score into a valid AtsScore. */
export function normalizeAts(raw: z.infer<typeof atsResultSchema>): AtsScore {
  const score = Math.max(0, Math.min(100, Math.round(raw.score)));
  return { score, matched: raw.matched, missing: raw.missing, suggestions: raw.suggestions };
}
