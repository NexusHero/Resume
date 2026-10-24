import { jest } from '@jest/globals';
import { AgentToolService, AGENT_TOOLS } from '../../src/services/agent-tool-service.js';
import type { AgentToolServiceDeps } from '../../src/services/agent-tool-service.js';
import type { TalentDocuments } from '../../src/domain/talent-documents.js';

function documents(over: Partial<TalentDocuments> = {}): TalentDocuments {
  return {
    ownerId: 'team',
    talentId: 't1',
    contact: { name: '', role: '', email: '', phone: '', location: '', linkedin: '' },
    resume: { summary: '', experience: [], education: [], skillGroups: [], rawText: '' },
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
      accent: '#000',
      strong: '#000',
      onDark: '#000',
      font: 'x',
      size: 1,
    },
    ...over,
  };
}

const clean = { grounded: true, unsupported: [] };
const flagged = { grounded: false, unsupported: [{ kind: 'skill', text: 'Rust' }] };

function makeService(overrides: Partial<AgentToolServiceDeps> = {}) {
  const deps: AgentToolServiceDeps = {
    jobSearchService: { search: jest.fn() } as unknown as AgentToolServiceDeps['jobSearchService'],
    jobPostingService: {
      adopt: jest.fn(),
      create: jest.fn(),
    } as unknown as AgentToolServiceDeps['jobPostingService'],
    jobPostingExtractService: {
      fromUrl: jest.fn(),
      fromText: jest.fn(),
    } as unknown as AgentToolServiceDeps['jobPostingExtractService'],
    talentService: {
      listWithSkills: jest.fn(),
    } as unknown as AgentToolServiceDeps['talentService'],
    matchService: { rankForJobText: jest.fn() } as unknown as AgentToolServiceDeps['matchService'],
    talentRepository: { list: jest.fn() } as unknown as AgentToolServiceDeps['talentRepository'],
    documentRepository: { get: jest.fn() } as unknown as AgentToolServiceDeps['documentRepository'],
    jobApplicationService: {
      create: jest.fn(),
      list: jest.fn(),
      get: jest.fn(),
      saveDocuments: jest.fn(),
    } as unknown as AgentToolServiceDeps['jobApplicationService'],
    applicationLetterService: {
      generate: jest.fn(),
    } as unknown as AgentToolServiceDeps['applicationLetterService'],
    magicPenService: {
      rewriteSection: jest.fn(),
      rewriteAll: jest.fn(),
    } as unknown as AgentToolServiceDeps['magicPenService'],
    ...overrides,
  };
  const service = new AgentToolService(deps);
  return { service, deps };
}

describe('AgentToolService', () => {
  it('AgentToolService_ToolRegistry_HasExactlyNineToolNames', () => {
    expect(AGENT_TOOLS.map((t) => t.name)).toEqual([
      'search_jobs',
      'save_job',
      'list_mandanten',
      'assess_fit',
      'create_application',
      'list_applications',
      'generate_letter',
      'tailor_section',
      'tailor_all',
    ]);
    // No forbidden action is exposed as a tool (AK-5.2).
    expect(AGENT_TOOLS.map((t) => t.name)).not.toContain('deleteJobApplication');
    expect(AGENT_TOOLS.map((t) => t.name)).not.toContain('changeJobApplicationStatus');
    expect(AGENT_TOOLS.map((t) => t.name)).not.toContain('sendOutreach');
  });

  it('AgentToolService_SearchJobs_ReturnsTrimmedJobs', async () => {
    const { service, deps } = makeService();
    (deps.jobSearchService.search as jest.Mock).mockResolvedValue({
      top: [
        {
          id: 'j1',
          company: 'Acme',
          role: 'Engineer',
          city: 'Berlin',
          country: 'DE',
          skills: [],
          match: 90,
          matchedSkills: [],
          missingSkills: [],
          source: 'Fake',
        },
      ],
      more: [],
      liveSourcesDown: false,
    });
    const result = (await service.dispatch('team', 'u1', 'search_jobs', {
      q: 'rust',
      limit: 5,
    })) as { jobs: Array<Record<string, unknown>> };
    expect(result.jobs).toHaveLength(1);
    expect(result.jobs[0]).toMatchObject({ id: 'j1', title: 'Engineer' });
    expect(deps.jobSearchService.search).toHaveBeenCalledWith({
      q: 'rust',
      threshold: 80,
    });
  });

  it('AgentToolService_SaveJob_AdoptWithSourceId_DelegatesToAdopt', async () => {
    const { service, deps } = makeService();
    (deps.jobPostingService.adopt as jest.Mock).mockResolvedValue({
      jobPosting: { id: 'p1' },
      alreadySaved: false,
    });
    await service.dispatch('team', 'u1', 'save_job', {
      source: 'Bundesagentur',
      sourceId: 'ref-1',
      company: 'Acme',
      title: 'Engineer',
    });
    expect(deps.jobPostingService.adopt).toHaveBeenCalled();
    expect(deps.jobPostingService.create).not.toHaveBeenCalled();
  });

  it('AgentToolService_SaveJob_UrlOnly_ExtractsThenCreates', async () => {
    const { service, deps } = makeService();
    (deps.jobPostingExtractService.fromUrl as jest.Mock).mockResolvedValue({
      company: 'Acme',
      title: 'Engineer',
      location: 'Berlin',
      country: 'DE',
      requirements: [],
      description: 'full ad',
      source: 'url',
      url: 'https://acme.test/job',
    });
    (deps.jobPostingService.create as jest.Mock).mockResolvedValue({
      jobPosting: { id: 'p2' },
      alreadySaved: false,
    });
    const result = (await service.dispatch('team', 'u1', 'save_job', {
      source: 'url',
      url: 'https://acme.test/job',
    })) as { jobPostingId: string };
    expect(result.jobPostingId).toBe('p2');
    expect(deps.jobPostingExtractService.fromUrl).toHaveBeenCalledWith(
      'u1',
      'https://acme.test/job',
    );
    expect(deps.jobPostingService.create).toHaveBeenCalled();
  });

  it('AgentToolService_SaveJob_OneToolCoversAdoptExtractCreate', async () => {
    // A single `save_job` handler covers all three entry paths — no second tool.
    const { service } = makeService();
    expect(AGENT_TOOLS.map((t) => t.name).filter((n) => n.includes('extract'))).toEqual([]);
    // Unknown tool is rejected.
    await expect(service.dispatch('team', 'u1', 'extract_job', {})).rejects.toThrow(
      'Unknown agent tool',
    );
  });

  it('AgentToolService_ListMandanten_ReturnsPool', async () => {
    const { service, deps } = makeService();
    (deps.talentService.listWithSkills as jest.Mock).mockResolvedValue([
      {
        id: 't1',
        name: 'Ada',
        role: 'Engineer',
        headline: '',
        location: '',
        effectiveSkills: ['Rust'],
        anonymizedAt: undefined,
      },
      {
        id: 't2',
        name: 'Anon',
        role: '',
        headline: '',
        location: '',
        effectiveSkills: [],
        anonymizedAt: '2026-01-01',
      },
    ]);
    const result = (await service.dispatch('team', 'u1', 'list_mandanten', {})) as Array<
      Record<string, unknown>
    >;
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ id: 't1', name: 'Ada', skills: ['Rust'] });
  });

  it('AgentToolService_AssessFit_WithMatchService_UsesRankForJobText', async () => {
    const { service, deps } = makeService();
    (deps.matchService!.rankForJobText as jest.Mock).mockResolvedValue([
      {
        talentId: 't1',
        name: 'Ada',
        role: 'Engineer',
        location: '',
        score: 80,
        matched: ['Rust'],
        skillScore: 80,
        semanticScore: 0,
        inPipeline: false,
      },
    ]);
    const result = (await service.dispatch('team', 'u1', 'assess_fit', {
      jobText: 'rust job',
      limit: 10,
    })) as Array<Record<string, unknown>>;
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ talentId: 't1', score: 80 });
    expect(deps.matchService!.rankForJobText).toHaveBeenCalledWith('team', 'rust job', 10);
  });

  it('AgentToolService_AssessFit_WithoutEmbeddings_FallsBackToSkillOverlap', async () => {
    const { service, deps } = makeService({ matchService: null });
    (deps.talentRepository.list as jest.Mock).mockResolvedValue([
      {
        id: 't1',
        name: 'Ada',
        role: 'Rust Engineer',
        headline: '',
        location: '',
        skills: ['Rust'],
      },
    ]);
    (deps.documentRepository.get as jest.Mock).mockResolvedValue(null);
    const result = (await service.dispatch('team', 'u1', 'assess_fit', {
      jobText: 'Rust',
      limit: 10,
    })) as Array<Record<string, unknown>>;
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ talentId: 't1', name: 'Ada' });
    expect(deps.talentRepository.list).toHaveBeenCalledWith('team');
  });

  it('AgentToolService_CreateApplication_SeedsDraftStatus', async () => {
    const { service, deps } = makeService();
    (deps.jobApplicationService.create as jest.Mock).mockResolvedValue({
      jobApplication: {
        id: 'a1',
        postingCompany: 'Acme',
        postingTitle: 'Engineer',
        talentName: 'Ada',
      },
      alreadyExisting: false,
    });
    const result = (await service.dispatch('team', 'u1', 'create_application', {
      jobPostingId: 'p1',
      talentId: 't1',
    })) as Record<string, unknown>;
    expect(result).toMatchObject({
      jobApplicationId: 'a1',
      alreadyExisting: false,
      status: 'draft',
    });
  });

  it('AgentToolService_ListApplications_ListsDraftsOnly', async () => {
    const { service, deps } = makeService();
    (deps.jobApplicationService.list as jest.Mock).mockResolvedValue([
      {
        id: 'a1',
        postingCompany: 'Acme',
        postingTitle: 'E',
        talentId: 't1',
        talentName: 'Ada',
        status: 'draft',
        createdAt: 'x',
      },
    ]);
    await service.dispatch('team', 'u1', 'list_applications', {});
    // The handler passes the hardcoded 'draft' status filter (AK-5.2).
    expect(deps.jobApplicationService.list).toHaveBeenCalledWith('team', undefined, 'draft');
  });

  it('AgentToolService_GenerateLetter_PersistsIntoDraftCopy', async () => {
    const { service, deps } = makeService();
    (deps.applicationLetterService.generate as jest.Mock).mockResolvedValue({
      letter: { paragraphs: ['Hello'], checks: {}, grounding: clean },
    });
    (deps.jobApplicationService.get as jest.Mock).mockResolvedValue({
      id: 'a1',
      documents: documents(),
    });
    const result = (await service.dispatch('team', 'u1', 'generate_letter', {
      jobApplicationId: 'a1',
    })) as Record<string, unknown>;
    expect(result.applied).toBe(true);
    expect(deps.jobApplicationService.saveDocuments).toHaveBeenCalled();
    const saved = (deps.jobApplicationService.saveDocuments as jest.Mock).mock.calls[0][2];
    expect(saved.letter.absaetze).toEqual(['Hello']);
  });

  it('AgentToolService_GenerateLetter_GroundingViolation_DoesNotPersistAndReportsWarning', async () => {
    const { service, deps } = makeService();
    (deps.applicationLetterService.generate as jest.Mock).mockResolvedValue({
      letter: { paragraphs: ['Hello'], checks: {}, grounding: flagged },
    });
    const result = (await service.dispatch('team', 'u1', 'generate_letter', {
      jobApplicationId: 'a1',
    })) as Record<string, unknown>;
    expect(result.applied).toBe(false);
    expect(deps.jobApplicationService.saveDocuments).not.toHaveBeenCalled();
  });

  it('AgentToolService_TailorSection_CleanGrounding_PersistsAfter', async () => {
    const { service, deps } = makeService();
    (deps.magicPenService.rewriteSection as jest.Mock).mockResolvedValue({
      section: 'headline',
      before: 'Old',
      after: 'New',
      provider: 'claude',
      grounding: clean,
    });
    (deps.jobApplicationService.get as jest.Mock).mockResolvedValue({
      id: 'a1',
      documents: documents(),
    });
    const result = (await service.dispatch('team', 'u1', 'tailor_section', {
      jobApplicationId: 'a1',
      section: 'headline',
    })) as Record<string, unknown>;
    expect(result.applied).toBe(true);
    const saved = (deps.jobApplicationService.saveDocuments as jest.Mock).mock.calls[0][2];
    expect(saved.contact.role).toBe('New');
  });

  it('AgentToolService_TailorSection_GroundingViolation_AppliedFalse', async () => {
    const { service, deps } = makeService();
    (deps.magicPenService.rewriteSection as jest.Mock).mockResolvedValue({
      section: 'headline',
      before: 'Old',
      after: 'New',
      provider: 'claude',
      grounding: flagged,
    });
    const result = (await service.dispatch('team', 'u1', 'tailor_section', {
      jobApplicationId: 'a1',
      section: 'headline',
    })) as Record<string, unknown>;
    expect(result.applied).toBe(false);
    expect(deps.jobApplicationService.saveDocuments).not.toHaveBeenCalled();
  });

  it('AgentToolService_ForbiddenActions_NotReachable', async () => {
    // The service is constructed with no delete/change-status/send capability,
    // and its dispatch rejects anything outside the nine names.
    const { service } = makeService();
    for (const forbidden of [
      'delete_job_application',
      'change_status',
      'send_outreach',
      'unfreeze',
    ]) {
      await expect(service.dispatch('team', 'u1', forbidden, {})).rejects.toThrow(
        'Unknown agent tool',
      );
    }
  });

  it('AgentToolService_SaveJob_CreatePath_PersistsFields', async () => {
    const { service, deps } = makeService();
    (deps.jobPostingService.create as jest.Mock).mockResolvedValue({
      jobPosting: { id: 'p3' },
      alreadySaved: false,
    });
    const result = (await service.dispatch('team', 'u1', 'save_job', {
      source: 'text',
      company: 'Acme',
      title: 'Engineer',
    })) as { jobPostingId: string };
    expect(result.jobPostingId).toBe('p3');
    expect(deps.jobPostingService.create).toHaveBeenCalled();
    expect(deps.jobPostingService.adopt).not.toHaveBeenCalled();
  });

  it('AgentToolService_SearchJobs_MergesTiersAndCaps', async () => {
    const { service, deps } = makeService();
    (deps.jobSearchService.search as jest.Mock).mockResolvedValue({
      top: [
        {
          id: 'j1',
          company: 'A',
          role: 'E',
          city: '',
          country: '',
          skills: [],
          match: 90,
          matchedSkills: [],
          missingSkills: [],
          source: 'Fake',
        },
      ],
      more: [
        {
          id: 'j2',
          company: 'B',
          role: 'E2',
          city: '',
          country: '',
          skills: [],
          match: 50,
          matchedSkills: [],
          missingSkills: [],
          source: 'Fake',
        },
      ],
      liveSourcesDown: true,
    });
    const result = (await service.dispatch('team', 'u1', 'search_jobs', { q: 'x', limit: 1 })) as {
      jobs: Array<Record<string, unknown>>;
      liveSourcesDown: boolean;
    };
    expect(result.jobs).toHaveLength(1);
    expect(result.liveSourcesDown).toBe(true);
  });

  it('AgentToolService_TailorAll_PersistsCleanSectionsAndCountsWarnings', async () => {
    const { service, deps } = makeService();
    (deps.magicPenService.rewriteAll as jest.Mock).mockResolvedValue({
      sections: [
        { section: 'headline', before: 'Old', after: 'New', provider: 'claude', grounding: clean },
        { section: 'summary', before: 'Old', after: 'New', provider: 'claude', grounding: flagged },
        {
          section: 'letter',
          before: [],
          after: ['Hallo'],
          provider: 'claude',
          grounding: clean,
          checks: {},
        },
        { error: { type: 'upstream-provider', detail: 'down' } },
      ],
    });
    (deps.jobApplicationService.get as jest.Mock).mockResolvedValue({
      id: 'a1',
      documents: documents(),
    });
    const result = (await service.dispatch('team', 'u1', 'tailor_all', {
      jobApplicationId: 'a1',
    })) as { applied: number; warnings: number };
    expect(result.applied).toBe(2);
    expect(result.warnings).toBe(2);
    expect(deps.jobApplicationService.saveDocuments).toHaveBeenCalledTimes(2);
  });

  it('AgentToolService_TailorAll_LetterGroundingViolation_CountsWarning', async () => {
    const { service, deps } = makeService();
    (deps.magicPenService.rewriteAll as jest.Mock).mockResolvedValue({
      sections: [
        {
          section: 'letter',
          before: [],
          after: ['Hallo'],
          provider: 'claude',
          grounding: flagged,
          checks: {},
        },
      ],
    });
    const result = (await service.dispatch('team', 'u1', 'tailor_all', {
      jobApplicationId: 'a1',
    })) as { applied: number; warnings: number };
    expect(result.applied).toBe(0);
    expect(result.warnings).toBe(1);
    expect(deps.jobApplicationService.saveDocuments).not.toHaveBeenCalled();
  });

  it('AgentToolService_TailorSection_ExperienceBullets_PersistsAfter', async () => {
    const { service, deps } = makeService();
    (deps.magicPenService.rewriteSection as jest.Mock).mockResolvedValue({
      section: 'experienceBullets',
      before: [],
      after: ['bullet'],
      provider: 'claude',
      grounding: clean,
      experienceIndex: 0,
      station: { role: 'Engineer', company: 'Acme', period: '2020—' },
    });
    const docs = documents();
    docs.resume.experience = [
      { role: 'Engineer', company: 'Acme', period: '2020—', location: '', bullets: [], skills: [] },
    ];
    (deps.jobApplicationService.get as jest.Mock).mockResolvedValue({ id: 'a1', documents: docs });
    const result = (await service.dispatch('team', 'u1', 'tailor_section', {
      jobApplicationId: 'a1',
      section: 'experienceBullets',
      experienceIndex: 0,
    })) as Record<string, unknown>;
    expect(result.applied).toBe(true);
    expect(result.experienceIndex).toBe(0);
    const saved = (deps.jobApplicationService.saveDocuments as jest.Mock).mock.calls[0][2];
    expect(saved.resume.experience[0].bullets).toEqual(['bullet']);
  });
});
