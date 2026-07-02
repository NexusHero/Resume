import {
  outreachPrompt,
  fallbackOutreach,
  normalizeOutreach,
  outreachRequestSchema,
  type OutreachOptions,
} from '../../src/domain/outreach';
import type { TalentDocuments } from '../../src/domain/talent-documents';

const documents: TalentDocuments = {
  ownerId: 'o',
  talentId: 't1',
  contact: {
    name: 'Max Mustermann',
    role: 'C++ Engineer',
    email: '',
    phone: '',
    location: '',
    linkedin: '',
  },
  resume: {
    summary: 'Senior C++ engineer.',
    experience: [
      { role: 'Lead', company: 'Acme', period: '', location: '', bullets: [], skills: ['gRPC'] },
    ],
    education: [],
    skillGroups: [{ label: 'Lang', items: ['C++', 'Rust', 'Python'] }],
  },
  letter: {
    firma: '',
    ansprechpartner: '',
    strasse: '',
    plzOrt: '',
    betreff: '',
    anrede: '',
    absaetze: [],
    gruss: '',
  },
  style: {
    template: 'classic',
    accent: '#2A6FDB',
    strong: '#1d4ed8',
    onDark: '#7aa7f5',
    font: 'x',
    size: 1,
  },
};

const opts = (over: Partial<OutreachOptions> = {}): OutreachOptions => ({
  audience: 'candidate',
  channel: 'email',
  tone: '',
  mandateContext: '',
  recruiterName: '',
  ...over,
});

describe('outreach', () => {
  it('OutreachRequest_AppliesDefaults', () => {
    const parsed = outreachRequestSchema.parse({});
    expect(parsed.audience).toBe('candidate');
    expect(parsed.channel).toBe('email');
    expect(parsed.tone).toBe('');
    expect(outreachRequestSchema.safeParse({ channel: 'sms' }).success).toBe(false);
  });

  it('OutreachPrompt_Candidate_AddressesTheCandidate', () => {
    const { system, prompt } = outreachPrompt(documents, opts({ mandateContext: 'C++ Lead' }));
    expect(system).toContain('JSON');
    expect(system).toContain('CANDIDATE');
    expect(system).toContain('Respond in English only.');
    expect(prompt).toContain('C++, Rust, Python');
    expect(prompt).toContain('C++ Lead');
  });

  it('OutreachPrompt_Client_AddressesTheClient', () => {
    const { system } = outreachPrompt(documents, opts({ audience: 'client' }));
    expect(system).toContain('CLIENT');
  });

  it('OutreachPrompt_LinkedIn_ForbidsSubject', () => {
    const { system } = outreachPrompt(documents, opts({ channel: 'linkedin' }));
    expect(system).toContain('NO subject');
  });

  it('OutreachPrompt_German_RespondsInGerman', () => {
    const { system, prompt } = outreachPrompt(documents, opts(), 'de');
    expect(system).toContain('Antworte ausschließlich auf Deutsch.');
    expect(prompt).toContain('(nicht angegeben)');
  });

  it('OutreachPrompt_ToneAndRecruiterName_AreApplied', () => {
    const { system } = outreachPrompt(
      documents,
      opts({ tone: 'locker, Du', recruiterName: 'Sara Weber' }),
    );
    expect(system).toContain('locker, Du');
    expect(system).toContain('Sara Weber');
  });

  it('OutreachPrompt_EmptyFacts_OmitsBlankLines', () => {
    const bare = {
      ...documents,
      contact: { ...documents.contact, name: '', role: '' },
      resume: { summary: '', experience: [], education: [], skillGroups: [] },
    };
    const { prompt } = outreachPrompt(bare, opts());
    expect(prompt).not.toContain('Name:');
    expect(prompt).not.toContain('Skills:');
    expect(prompt).toContain('(not provided)');
  });

  it('FallbackOutreach_CandidateEmail_HasSubjectAndBody', () => {
    const msg = fallbackOutreach(documents, opts());
    expect(msg.subject).toContain('C++ Engineer');
    expect(msg.body).toContain('C++');
    expect(msg.body.length).toBeGreaterThan(20);
  });

  it('FallbackOutreach_ClientEmail_PresentsCandidate', () => {
    const msg = fallbackOutreach(documents, opts({ audience: 'client' }));
    expect(msg.subject).toContain('position');
    expect(msg.body).toContain('Max Mustermann');
  });

  it('FallbackOutreach_German_ProducesGermanCopy', () => {
    const msg = fallbackOutreach(documents, opts(), 'de');
    expect(msg.body).toContain('Hätten Sie diese Woche');
    expect(msg.body).toContain('Ihr Profil als');
    const client = fallbackOutreach(documents, opts({ audience: 'client' }), 'de');
    expect(client.body).toContain('Sehr geehrte Damen und Herren');
  });

  it('FallbackOutreach_LinkedIn_HasNoSubject', () => {
    const cand = fallbackOutreach(documents, opts({ channel: 'linkedin' }));
    const client = fallbackOutreach(documents, opts({ audience: 'client', channel: 'linkedin' }));
    expect(cand.subject).toBe('');
    expect(client.subject).toBe('');
    expect(cand.body.length).toBeGreaterThan(0);
  });

  it('FallbackOutreach_WithRecruiterName_SignsAllVariants', () => {
    expect(fallbackOutreach(documents, opts({ recruiterName: 'Sara Weber' })).body).toContain(
      'Sara Weber',
    );
    expect(
      fallbackOutreach(documents, opts({ channel: 'linkedin', recruiterName: 'Sara Weber' })).body,
    ).toContain('Sara Weber');
    expect(
      fallbackOutreach(documents, opts({ audience: 'client', recruiterName: 'Sara Weber' })).body,
    ).toContain('Sara Weber');
    expect(
      fallbackOutreach(
        documents,
        opts({ audience: 'client', channel: 'linkedin', recruiterName: 'Sara Weber' }),
      ).body,
    ).toContain('Sara Weber');
  });

  it('FallbackOutreach_NoSkillsNoName_StillUsable', () => {
    const bare = {
      ...documents,
      contact: { ...documents.contact, name: '', role: '' },
      resume: { summary: '', experience: [], education: [], skillGroups: [] },
    };
    const msg = fallbackOutreach(bare, opts());
    expect(msg.body.length).toBeGreaterThan(0);
    expect(msg.subject).toContain('the role');
  });

  it('NormalizeOutreach_StripsSubjectForLinkedIn', () => {
    const email = normalizeOutreach({ subject: '  Hallo  ', body: '  Text  ' }, 'email');
    expect(email.subject).toBe('Hallo');
    expect(email.body).toBe('Text');
    const li = normalizeOutreach({ subject: 'should vanish', body: 'x' }, 'linkedin');
    expect(li.subject).toBe('');
  });

  // Sweep every audience × channel × language combination so both the English
  // and German fallback branches are exercised.
  it('FallbackOutreach_CoversAllAudienceChannelLangCombos', () => {
    for (const lang of ['en', 'de'] as const) {
      for (const audience of ['candidate', 'client'] as const) {
        for (const channel of ['email', 'linkedin'] as const) {
          const opts: OutreachOptions = {
            audience,
            channel,
            tone: '',
            mandateContext: '',
            recruiterName: 'Sam Recruiter',
          };
          const msg = fallbackOutreach(documents, opts, lang);
          expect(msg.body).toContain('Sam Recruiter');
          expect(channel === 'linkedin' ? msg.subject === '' : msg.subject.length > 0).toBe(true);
        }
      }
    }
    // Also cover the no-recruiter-name branch (no signature appended).
    const noName = fallbackOutreach(
      documents,
      { audience: 'client', channel: 'email', tone: '', mandateContext: '', recruiterName: '' },
      'de',
    );
    expect(noName.body).not.toContain('Mit freundlichen Grüßen\n\n');
  });
});
