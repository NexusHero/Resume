import {
  seedDemo,
  demoTalent,
  demoPosting,
  demoApplication,
  DEMO_PII_DENYLIST,
  DEMO_TALENT_ID,
  DEMO_POSTING_ID,
  DEMO_APPLICATION_ID,
} from '../../src/demo-seed.js';
import {
  InMemoryTalentRepository,
  InMemoryJobPostingRepository,
  InMemoryJobApplicationRepository,
  InMemoryWorkspaceSettingsStore,
} from '../support/fakes.js';

const SCOPE = 'team';

function deps() {
  return {
    scope: SCOPE,
    talentRepository: new InMemoryTalentRepository(),
    jobPostingRepository: new InMemoryJobPostingRepository(),
    jobApplicationRepository: new InMemoryJobApplicationRepository(),
    workspaceSettingsStore: new InMemoryWorkspaceSettingsStore(),
  };
}

describe('demo seed (AK-6.6)', () => {
  it('SeedDemo_Idempotent_NoDuplicates', async () => {
    const d = deps();
    await seedDemo(d);
    await seedDemo(d);
    expect(d.talentRepository.talents).toHaveLength(1);
    expect(d.jobPostingRepository.postings).toHaveLength(1);
    expect(d.jobApplicationRepository.applications).toHaveLength(1);
  });

  it('SeedDemo_CreatesMandantStelleBewerbungWithFixedIds', async () => {
    const d = deps();
    const result = await seedDemo(d);
    expect(result.talent.id).toBe(DEMO_TALENT_ID);
    expect(result.posting.id).toBe(DEMO_POSTING_ID);
    expect(result.application.id).toBe(DEMO_APPLICATION_ID);
    expect(result.application.status).toBe('draft');
    expect(result.application.jobPostingId).toBe(DEMO_POSTING_ID);
    expect(result.application.talentId).toBe(DEMO_TALENT_ID);
  });

  it('SeedDemo_Synthetic_NoRealPii', () => {
    const blob = JSON.stringify({
      talent: demoTalent(),
      posting: demoPosting(),
      application: demoApplication('team'),
    }).toLowerCase();
    const hits = DEMO_PII_DENYLIST.filter((forbidden) => blob.includes(forbidden.toLowerCase()));
    expect(hits).toEqual([]);
    // Clearly fictional markers are present.
    expect(blob).toContain('beispiel');
    expect(blob).toContain('demo-');
  });

  it('SeedDemo_Default_LeavesAiConsentUnset', async () => {
    const d = deps();
    await seedDemo(d);
    expect(await d.workspaceSettingsStore.get(SCOPE)).toBeNull();
  });

  it('SeedDemo_WithConsentFlag_PresetsAiConsentTrue', async () => {
    const d = deps();
    await seedDemo(d, { withConsent: true });
    expect((await d.workspaceSettingsStore.get(SCOPE))?.aiConsent).toBe(true);
  });
});
