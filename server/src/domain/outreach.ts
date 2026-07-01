import { z } from 'zod';
import type { TalentDocuments } from './talent-documents';

/** Who the message is written to. */
export const outreachAudiences = ['candidate', 'client'] as const;
export type OutreachAudience = (typeof outreachAudiences)[number];

/** Where it will be sent (shapes length + whether there's a subject line). */
export const outreachChannels = ['email', 'linkedin'] as const;
export type OutreachChannel = (typeof outreachChannels)[number];

/** POST /api/v1/talents/:id/documents/outreach */
export const outreachRequestSchema = z.object({
  audience: z.enum(outreachAudiences).default('candidate'),
  channel: z.enum(outreachChannels).default('email'),
  tone: z.string().max(80).default(''), // e.g. "locker, Du" / "förmlich, Sie"
  mandateContext: z.string().max(50_000).default(''),
  recruiterName: z.string().max(120).default(''),
});
export type OutreachRequestInput = z.infer<typeof outreachRequestSchema>;

/** Options that steer the generated message (everything but the talent). */
export interface OutreachOptions {
  audience: OutreachAudience;
  channel: OutreachChannel;
  tone: string;
  mandateContext: string;
  recruiterName: string;
}

/** A generated first-contact message. `subject` is empty for LinkedIn. */
export interface OutreachMessage {
  subject: string;
  body: string;
}

/** The shape the LLM must return; validated leniently, then normalized. */
export const outreachResultSchema = z.object({
  subject: z.string().default(''),
  body: z.string().default(''),
});

function candidateFacts(documents: TalentDocuments): string {
  const { contact, resume } = documents;
  const roles = resume.experience
    .map((e) => [e.role, e.company].filter(Boolean).join(' @ '))
    .filter(Boolean);
  const skills = resume.skillGroups.flatMap((g) => g.items);
  return [
    contact.name ? `Name: ${contact.name}` : '',
    contact.role ? `Rolle: ${contact.role}` : '',
    resume.summary ? `Profil: ${resume.summary}` : '',
    roles.length ? `Stationen: ${roles.join('; ')}` : '',
    skills.length ? `Skills: ${skills.join(', ')}` : '',
  ]
    .filter(Boolean)
    .join('\n');
}

export function outreachPrompt(
  documents: TalentDocuments,
  opts: OutreachOptions,
): { system: string; prompt: string } {
  const toClient = opts.audience === 'client';
  const isEmail = opts.channel === 'email';
  const audienceRule = toClient
    ? 'Schreibe an einen KUNDEN (Auftraggeber): stelle diese:n Kandidat:in überzeugend für ' +
      'dessen offene Position vor. Sprich den Kunden an, nicht die Kandidatin.'
    : 'Schreibe an die/den KANDIDAT:IN direkt (passive Ansprache/Sourcing): wecke Interesse an ' +
      'der Rolle. Sprich die Person an, verkaufe die Chance, ohne aufdringlich zu sein.';
  const channelRule = isEmail
    ? 'Kanal E-Mail: liefere eine prägnante Betreffzeile (subject) und einen Fließtext (body) mit ' +
      'Anrede und Grußformel.'
    : 'Kanal LinkedIn-Direktnachricht: KEIN Betreff (subject = ""). body ist kurz (max. ~120 Wörter), ' +
      'ohne formelle Grußformel, direkt und persönlich.';
  const toneRule = opts.tone
    ? `Tonalität: ${opts.tone}.`
    : 'Tonalität: professionell und freundlich.';
  const signature = opts.recruiterName
    ? `Unterschreibe mit „${opts.recruiterName}".`
    : 'Lass die Signatur/den Absendernamen weg (der Nutzer ergänzt ihn).';

  return {
    system:
      'Du bist erfahrene:r Personalberater:in und schreibst die erste Kontaktnachricht. ' +
      `${audienceRule} ${channelRule} ${toneRule} ${signature} ` +
      'Baue 1–2 konkrete Anknüpfungspunkte aus dem Profil ein und ende mit einem klaren, ' +
      'niedrigschwelligen Call-to-Action. Erfinde keine Fakten. Gib AUSSCHLIESSLICH gültiges ' +
      'JSON zurück (keine Erklärung, keine Markdown-Fences): {"subject":"","body":""}.',
    prompt: `Kandidat:\n${candidateFacts(documents)}\n\nMandat/Stellenkontext:\n"""\n${
      opts.mandateContext || '(nicht angegeben)'
    }\n"""`,
  };
}

/**
 * Deterministic fallback (no LLM): assemble a solid, honest first-contact
 * message from the talent's facts, so the feature always returns something.
 */
export function fallbackOutreach(
  documents: TalentDocuments,
  opts: OutreachOptions,
): OutreachMessage {
  const { contact, resume } = documents;
  const name = contact.name || 'die/der Kandidat:in';
  const role = contact.role || resume.experience[0]?.role || 'die Rolle';
  const skills = resume.skillGroups.flatMap((g) => g.items).slice(0, 3);
  const skillPart = skills.length ? ` (u. a. ${skills.join(', ')})` : '';
  const sign = opts.recruiterName ? `\n\n${opts.recruiterName}` : '';
  const toClient = opts.audience === 'client';

  if (toClient) {
    const body =
      `Sehr geehrte Damen und Herren,\n\n` +
      `für Ihre offene Position möchte ich Ihnen ${name} vorstellen — ${role}${skillPart}. ` +
      `Das Profil passt aus meiner Sicht sehr gut zu Ihren Anforderungen.\n\n` +
      `Gerne schicke ich Ihnen die vollständigen Unterlagen zu oder stelle den Kontakt her. ` +
      `Passt Ihnen ein kurzes Telefonat diese Woche?` +
      (opts.recruiterName ? `\n\nMit freundlichen Grüßen${sign}` : '');
    return opts.channel === 'linkedin'
      ? {
          subject: '',
          body: `Hallo, ich habe mit ${name} (${role}${skillPart}) ein Profil, das gut zu Ihrer offenen Position passen könnte. Interesse an den Details?${sign}`,
        }
      : { subject: `Passende:r Kandidat:in für Ihre Position: ${role}`, body };
  }

  const body =
    `Hallo ${contact.name || ''}`.trim() +
    ',\n\n' +
    `ich bin auf Ihr Profil als ${role}${skillPart} aufmerksam geworden und habe eine Rolle, ` +
    `die gut passen könnte.\n\n` +
    `Hätten Sie diese Woche 15 Minuten für ein kurzes Gespräch? Dann gebe ich Ihnen die Details.` +
    (opts.recruiterName ? `\n\nBeste Grüße${sign}` : '');
  return opts.channel === 'linkedin'
    ? {
        subject: '',
        body:
          `Hallo ${contact.name || ''}`.trim() +
          `, Ihr Profil als ${role}${skillPart} passt gut zu einer Rolle, die ich gerade besetze. Kurz austauschen?${sign}`,
      }
    : { subject: `Spannende Rolle für Ihr Profil als ${role}`, body };
}

/** Trim and, for LinkedIn, drop any subject the LLM produced anyway. */
export function normalizeOutreach(
  raw: z.infer<typeof outreachResultSchema>,
  channel: OutreachChannel,
): OutreachMessage {
  return {
    subject: channel === 'linkedin' ? '' : raw.subject.replace(/\s+/g, ' ').trim(),
    body: raw.body.trim(),
  };
}
