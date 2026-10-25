import {
  agentFakeEnabled,
  draftTitleOf,
  isGroundingClean,
  summarizeRun,
  TOOL_NAMES,
  untrustedBlock,
} from '../../src/domain/chat-agent.js';

describe('chat-agent domain helpers', () => {
  it('UntrustedBlock_WrapsTextInUntrustedMarkers', () => {
    expect(untrustedBlock('search_jobs', '{"jobs":[]}')).toBe(
      '<untrusted-data label="search_jobs">{"jobs":[]}</untrusted-data>',
    );
  });

  it('SummarizeRun_ListCreatedDrafts_ReturnsDeterministicSummary', () => {
    const summary = summarizeRun([
      { jobApplicationId: 'a1', postingCompany: 'Acme', postingTitle: 'Engineer' },
      { jobApplicationId: 'a2', postingCompany: 'Globex', postingTitle: 'Lead' },
    ]);
    expect(summary).toBe('2 application drafts created: Acme – Engineer, Globex – Lead.');
  });

  it('SummarizeRun_NoSteps_ReturnsHonestEmptySummary', () => {
    expect(summarizeRun([])).toBe('The agent did not create any application drafts in this run.');
  });

  it('DraftTitleOf_FirstMessage_TruncatesToTitle', () => {
    expect(draftTitleOf('Erstelle für mich drei Bewerbungen')).toBe(
      'Erstelle für mich drei Bewerbungen',
    );
    const long = 'A'.repeat(100);
    const title = draftTitleOf(long);
    expect(title.length).toBeLessThanOrEqual(60);
    expect(title.endsWith('…')).toBe(true);
  });

  it('DraftTitleOf_FirstMessage_CollapsesWhitespace', () => {
    expect(draftTitleOf('  Hallo\n  Welt  ')).toBe('Hallo Welt');
  });

  it('IsGroundingClean_NoViolations_True', () => {
    expect(isGroundingClean({ grounded: true, unsupported: [] })).toBe(true);
  });

  it('IsGroundingClean_Violation_False', () => {
    expect(
      isGroundingClean({ grounded: false, unsupported: [{ kind: 'skill', text: 'Rust' }] }),
    ).toBe(false);
  });

  it('AgentFakeEnabled_Production_ReturnsFalse', () => {
    expect(agentFakeEnabled({ NODE_ENV: 'production', AGENT_FAKE: '1' })).toBe(false);
  });

  it('AgentFakeEnabled_NonProduction_WithFlag_ReturnsTrue', () => {
    expect(agentFakeEnabled({ NODE_ENV: 'development', AGENT_FAKE: '1' })).toBe(true);
  });

  it('AgentFakeEnabled_WithoutFlag_ReturnsFalse', () => {
    expect(agentFakeEnabled({ NODE_ENV: 'development', AGENT_FAKE: undefined })).toBe(false);
  });

  it('ToolNames_AreExactlyTheNineAllowed', () => {
    expect(TOOL_NAMES).toEqual([
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
  });
});
