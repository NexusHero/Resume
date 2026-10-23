import {
  outreachPrompt,
  normalizeOutreach,
  outreachRequestSchema,
  type OutreachOptions,
} from '../../src/domain/outreach.js';
import type { TalentDocuments } from '../../src/domain/talent-documents.js';

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

  it('NormalizeOutreach_StripsSubjectForLinkedIn', () => {
    const email = normalizeOutreach({ subject: '  Hallo  ', body: '  Text  ' }, 'email');
    expect(email.subject).toBe('Hallo');
    expect(email.body).toBe('Text');
    const li = normalizeOutreach({ subject: 'should vanish', body: 'x' }, 'linkedin');
    expect(li.subject).toBe('');
  });
});
