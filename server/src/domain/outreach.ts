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
