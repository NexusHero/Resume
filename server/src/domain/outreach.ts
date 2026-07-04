import { z } from 'zod';
import type { OutputLang } from './language.js';
import type { TalentDocuments } from './talent-documents.js';
import { candidateFacts } from './candidate-facts.js';

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

export function outreachPrompt(
  documents: TalentDocuments,
  opts: OutreachOptions,
  lang: OutputLang = 'en',
): { system: string; prompt: string } {
  const toClient = opts.audience === 'client';
  const isEmail = opts.channel === 'email';
  const audienceRule = toClient
    ? 'Write to a CLIENT (hiring company): pitch this candidate convincingly for their open ' +
      'position. Address the client, not the candidate.'
    : 'Write to the CANDIDATE directly (passive sourcing outreach): spark interest in the role. ' +
      'Address the person, sell the opportunity, without being pushy.';
  const channelRule = isEmail
    ? 'Channel email: provide a concise subject line (subject) and a body with a greeting and ' +
      'a sign-off.'
    : 'Channel LinkedIn direct message: NO subject (subject = ""). The body is short ' +
      '(max ~120 words), without a formal sign-off, direct and personal.';
  const toneRule = opts.tone ? `Tone: ${opts.tone}.` : 'Tone: professional and friendly.';
  const signature = opts.recruiterName
    ? `Sign off with "${opts.recruiterName}".`
    : 'Leave out the signature/sender name (the user will add it).';
  const langRule =
    lang === 'de' ? ' Antworte ausschließlich auf Deutsch.' : ' Respond in English only.';
  const promptLabels =
    lang === 'de'
      ? { candidate: 'Kandidat', mandate: 'Mandat/Stellenkontext', missing: '(nicht angegeben)' }
      : { candidate: 'Candidate', mandate: 'Mandate/role context', missing: '(not provided)' };

  return {
    system:
      'You are an experienced recruiter writing the first-contact message. ' +
      `${audienceRule} ${channelRule} ${toneRule} ${signature} ` +
      'Weave in 1-2 concrete hooks from the profile and end with a clear, low-friction ' +
      'call-to-action. Do not invent facts. Return ONLY valid JSON (no explanation, no ' +
      'markdown fences): {"subject":"","body":""}.' +
      langRule,
    prompt: `${promptLabels.candidate}:\n${candidateFacts(documents, { lang })}\n\n${
      promptLabels.mandate
    }:\n"""\n${opts.mandateContext || promptLabels.missing}\n"""`,
  };
}

/**
 * Deterministic fallback (no LLM): assemble a solid, honest first-contact
 * message from the talent's facts, so the feature always returns something.
 */
export function fallbackOutreach(
  documents: TalentDocuments,
  opts: OutreachOptions,
  lang: OutputLang = 'en',
): OutreachMessage {
  const { contact, resume } = documents;
  const sign = opts.recruiterName ? `\n\n${opts.recruiterName}` : '';
  const toClient = opts.audience === 'client';

  if (lang === 'de') {
    const name = contact.name || 'die/der Kandidat:in';
    const role = contact.role || resume.experience[0]?.role || '';
    // With no known role the "als <Rolle>"-phrases read broken — drop them.
    const alsRolle = role ? ` als ${role}` : '';
    const skills = resume.skillGroups.flatMap((g) => g.items).slice(0, 3);
    const skillPart = skills.length ? ` (u. a. ${skills.join(', ')})` : '';

    if (toClient) {
      const body =
        `Sehr geehrte Damen und Herren,\n\n` +
        `für Ihre offene Position möchte ich Ihnen ${name} vorstellen${role ? ` — ${role}` : ''}${skillPart}. ` +
        `Das Profil passt aus meiner Sicht sehr gut zu Ihren Anforderungen.\n\n` +
        `Gerne schicke ich Ihnen die vollständigen Unterlagen zu oder stelle den Kontakt her. ` +
        `Passt Ihnen ein kurzes Telefonat diese Woche?` +
        (opts.recruiterName ? `\n\nMit freundlichen Grüßen${sign}` : '');
      return opts.channel === 'linkedin'
        ? {
            subject: '',
            body: `Hallo, ich habe mit ${name}${role ? ` (${role}${skillPart})` : skillPart} ein Profil, das gut zu Ihrer offenen Position passen könnte. Interesse an den Details?${sign}`,
          }
        : {
            subject: role
              ? `Passende:r Kandidat:in für Ihre Position: ${role}`
              : 'Passende:r Kandidat:in für Ihre Position',
            body,
          };
    }

    const body =
      `Hallo ${contact.name || ''}`.trim() +
      ',\n\n' +
      `ich bin auf Ihr Profil${alsRolle}${skillPart} aufmerksam geworden und habe eine Rolle, ` +
      `die gut passen könnte.\n\n` +
      `Hätten Sie diese Woche 15 Minuten für ein kurzes Gespräch? Dann gebe ich Ihnen die Details.` +
      (opts.recruiterName ? `\n\nBeste Grüße${sign}` : '');
    return opts.channel === 'linkedin'
      ? {
          subject: '',
          body:
            `Hallo ${contact.name || ''}`.trim() +
            `, Ihr Profil${alsRolle}${skillPart} passt gut zu einer Rolle, die ich gerade besetze. Kurz austauschen?${sign}`,
        }
      : {
          subject: role
            ? `Spannende Rolle für Ihr Profil als ${role}`
            : 'Spannende Rolle für Ihr Profil',
          body,
        };
  }

  const name = contact.name || 'the candidate';
  const role = contact.role || resume.experience[0]?.role || '';
  // With no known role the "as <role>"-phrases read broken — drop them.
  const asRole = role ? ` as ${role}` : '';
  const skills = resume.skillGroups.flatMap((g) => g.items).slice(0, 3);
  const skillPart = skills.length ? ` (incl. ${skills.join(', ')})` : '';

  if (toClient) {
    const body =
      `Dear Sir or Madam,\n\n` +
      `for your open position I would like to introduce ${name}${role ? ` — ${role}` : ''}${skillPart}. ` +
      `In my view the profile is a very good match for your requirements.\n\n` +
      `I would be happy to send you the full documents or make the introduction. ` +
      `Would a short call this week work for you?` +
      (opts.recruiterName ? `\n\nBest regards${sign}` : '');
    return opts.channel === 'linkedin'
      ? {
          subject: '',
          body: `Hello, I have a profile in ${name}${role ? ` (${role}${skillPart})` : skillPart} that could be a good fit for your open position. Interested in the details?${sign}`,
        }
      : {
          subject: role
            ? `A strong candidate for your position: ${role}`
            : 'A strong candidate for your position',
          body,
        };
  }

  const body =
    `Hello ${contact.name || ''}`.trim() +
    ',\n\n' +
    `I came across your profile${asRole}${skillPart} and have a role that could be a great fit.\n\n` +
    `Would you have 15 minutes this week for a quick chat? I can share the details then.` +
    (opts.recruiterName ? `\n\nBest regards${sign}` : '');
  return opts.channel === 'linkedin'
    ? {
        subject: '',
        body:
          `Hello ${contact.name || ''}`.trim() +
          `, your profile${asRole}${skillPart} is a good fit for a role I am currently filling. Quick chat?${sign}`,
      }
    : {
        subject: role
          ? `An exciting role for your profile as ${role}`
          : 'An exciting role for your profile',
        body,
      };
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
