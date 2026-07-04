import { mandateToTarget, jobToTarget } from '../../src/domain/application-target.js';
import {
  tailorPrompt,
  fallbackTailor,
  normalizeTailored,
  tailorResultSchema,
} from '../../src/domain/application-tailor.js';
import type { Mandate } from '../../src/domain/mandate.js';
import type { Job } from '../../src/domain/job.js';
import type { TalentDocuments } from '../../src/domain/talent-documents.js';
import {
  emptyContact,
  emptyResume,
  emptyLetter,
  defaultStyle,
} from '../../src/domain/talent-documents.js';

const mandate = (over: Partial<Mandate> = {}): Mandate => ({
  id: 'm1',
  ownerId: 'team',
  client: 'Helio',
  role: 'Backend Engineer',
  location: 'Berlin',
  fee: '',
  feeValue: '',
  deadline: '',
  priority: 'medium',
  status: 'active',
  submitted: 0,
  interviews: 0,
  jobText: 'We need a Go engineer for our Kubernetes platform.',
  lang: 'en',
  createdAt: '2026-06-01T00:00:00.000Z',
  updatedAt: '2026-06-01T00:00:00.000Z',
  ...over,
});

const job = (over: Partial<Job> = {}): Job => ({
  id: 'j1',
  company: 'Globex',
  role: 'Entwickler',
  city: 'München',
  country: 'DE',
  mode: 'hybrid',
  skills: ['Java', 'Spring'],
  snippet: 'Wir suchen eine erfahrene Entwicklerin für unsere Backend-Teams.',
  source: 'arbeitnow',
  ...over,
});

const docs = (): TalentDocuments => ({
  ownerId: 'team',
  talentId: 't1',
  contact: { ...emptyContact, name: 'Jane Dev', role: 'Engineer' },
  resume: {
    ...emptyResume,
    summary: 'Seasoned engineer.',
    skillGroups: [{ label: 'Core', items: ['Go', 'Kubernetes', 'gRPC'] }],
  },
  letter: { ...emptyLetter },
  style: defaultStyle,
  updatedAt: '2026-06-01T00:00:00.000Z',
});

describe('application-target normalizers', () => {
  it('MandateToTarget_CarriesAdLanguageAndClient', () => {
    expect(mandateToTarget(mandate())).toEqual({
      source: 'mandates',
      ref: 'm1',
      role: 'Backend Engineer',
      company: 'Helio',
      location: 'Berlin',
      jobText: 'We need a Go engineer for our Kubernetes platform.',
      lang: 'en',
    });
  });

  it('JobToTarget_BuildsAdTextAndDetectsGermanFromPosting', () => {
    const target = jobToTarget(job());
    expect(target.source).toBe('jobs');
    expect(target.ref).toBe('j1');
    expect(target.company).toBe('Globex');
    expect(target.location).toBe('München, DE');
    expect(target.jobText).toContain('Entwickler');
    expect(target.jobText).toContain('Java, Spring');
    expect(target.lang).toBe('de'); // detected from the German snippet
  });

  it('JobToTarget_HandlesMissingSnippet', () => {
    const target = jobToTarget(job({ snippet: undefined, skills: [] }));
    expect(target.jobText).toBe('Entwickler');
  });
});

describe('application-tailor', () => {
  it('TailorPrompt_SwitchesLanguageInstruction', () => {
    expect(tailorPrompt(docs(), { role: 'X', company: 'Y', jobText: 'ad' }, 'de').system).toContain(
      'ausschließlich auf Deutsch',
    );
    expect(tailorPrompt(docs(), { role: 'X', company: 'Y', jobText: 'ad' }, 'en').system).toContain(
      'English only',
    );
  });

  it('TailorPrompt_EmbedsAdTextAndTruncates', () => {
    const long = 'x'.repeat(9000);
    const built = tailorPrompt(docs(), { role: 'Dev', company: 'ACME', jobText: long }, 'en');
    expect(built.prompt).toContain('"Dev" at ACME');
    expect(built.prompt).toContain('x'.repeat(6000));
    expect(built.prompt).not.toContain('x'.repeat(6001)); // capped at 6000
  });

  it('TailorPrompt_NoAdText_ShowsPlaceholder', () => {
    const built = tailorPrompt(docs(), { role: 'Dev', company: '', jobText: '' }, 'en');
    expect(built.prompt).toContain('(no ad text provided)');
  });

  it('FallbackTailor_ReusesEditorFallbacks_InTargetLanguage', () => {
    const de = fallbackTailor(docs(), { role: 'Entwickler', company: 'Globex', jobText: '' }, 'de');
    expect(de.summary).toMatch(/Erfahren|Fachkraft|Engineer/);
    expect(de.paragraphs).toHaveLength(3);
    expect(de.paragraphs[0]).toContain('Globex');
    const en = fallbackTailor(docs(), { role: 'Dev', company: 'ACME', jobText: '' }, 'en');
    expect(en.paragraphs[0]).toContain('ACME');
  });

  it('NormalizeTailored_TrimsAndDropsEmptyParagraphs', () => {
    expect(
      normalizeTailored({ summary: '  a   b ', paragraphs: [' one ', '', '  ', 'two'] }),
    ).toEqual({ summary: 'a b', paragraphs: ['one', 'two'] });
  });

  it('TailorResultSchema_AcceptsWellShapedJson', () => {
    expect(tailorResultSchema.safeParse({ summary: 's', paragraphs: ['p'] }).success).toBe(true);
    expect(tailorResultSchema.safeParse({ summary: 's' }).success).toBe(false);
  });
});
