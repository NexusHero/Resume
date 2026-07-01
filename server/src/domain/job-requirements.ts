/**
 * Extract the concrete, explicitly-signalled requirements from a job ad. The ad
 * is the employer's own words for this exact role, so what we pull out here is
 * grounded — we quote it, we don't invent it. This deliberately captures only
 * clearly-flagged items (must / nice-to-have / obligation / process hint); the
 * fuzzier "does the CV cover skill X" question is answered separately by the
 * ATS/semantic overlap. Together they drive candidate prep without guessing.
 */
export interface JobRequirements {
  musts: string[]; // explicitly required
  shoulds: string[]; // nice-to-have / advantageous
  obligations: string[]; // Auflagen the candidate must satisfy or bring
  processHints: string[]; // what the hiring process itself will involve
}

const CUES = {
  process:
    /assessment|case study|arbeitsprobe|probearbeit|technischer? test|coding[- ]?challenge|gespr[äa]chsrunde|bewerbungsprozess|kennenlern|hackerrank|take[- ]?home/i,
  should:
    /von vorteil|wünschenswert|idealerweise|nice ?to ?have|\bplus\b|bonus|gerne|optional|erwünscht/i,
  obligation:
    /zertifikat|führerschein|reisebereit|schicht|verhandlungssicher|sprachniveau|\b[abc][12]\b|gehaltsvorstellung|eintrittstermin|nachweis|approbation|sicherheitsüberpr|umzug|relocat|bereitschaft/i,
  must: /erforderlich|zwingend|voraussetzung|setzen wir voraus|müssen|\bmuss\b|\brequired\b|must[- ]?have|mindestens \d+ jahr|\d+\+? *jahre? (?:berufs)?erfahrung|abgeschlossenes? studium/i,
};

/** Break the ad into candidate items: lines and bullet points, cleaned. */
function items(jobText: string): string[] {
  return jobText
    .split(/\r?\n/)
    .map((l) => l.replace(/^\s*[-*–•·‣▪◦]+\s*/, '').trim())
    .filter((l) => l.length >= 4 && l.length <= 300);
}

function pushUnique(list: string[], value: string): void {
  const key = value.toLowerCase();
  if (!list.some((v) => v.toLowerCase() === key)) list.push(value);
}

/** Classify each clearly-signalled line into its bucket (first match wins). */
export function extractRequirements(jobText: string): JobRequirements {
  const out: JobRequirements = { musts: [], shoulds: [], obligations: [], processHints: [] };
  for (const item of items(jobText)) {
    // Order matters: a process step or a soft "nice to have" outranks a bare
    // "required", and an explicit obligation outranks a generic must.
    if (CUES.process.test(item)) pushUnique(out.processHints, item);
    else if (CUES.should.test(item)) pushUnique(out.shoulds, item);
    else if (CUES.obligation.test(item)) pushUnique(out.obligations, item);
    else if (CUES.must.test(item)) pushUnique(out.musts, item);
  }
  const cap = (l: string[]) => l.slice(0, 8);
  return {
    musts: cap(out.musts),
    shoulds: cap(out.shoulds),
    obligations: cap(out.obligations),
    processHints: cap(out.processHints),
  };
}
