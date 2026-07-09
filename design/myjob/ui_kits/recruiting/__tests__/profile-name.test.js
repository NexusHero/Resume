/* The recruiter's display name is stored on their own document set. Setting it
   must merge into the contact block and preserve any existing resume/letter/style
   — a naive save would wipe the recruiter's own documents. */
import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';

let api;

beforeAll(async () => {
  await import('../data.js'); // publishes window.RecruitApi
  api = window.RecruitApi;
});

describe('RecruitApi profile name', () => {
  beforeEach(() => {
    api.getTalentDocuments = vi.fn().mockResolvedValue({
      contact: { name: 'Old Name', email: 'nora@example.de' },
      resume: { summary: 'keep me' },
      letter: { betreff: 'Bewerbung' },
      style: { accent: '#111111' },
    });
    api.saveTalentDocuments = vi.fn().mockResolvedValue({});
  });

  it('GetMyProfileName_ReturnsStoredName', async () => {
    expect(await api.getMyProfileName('u1')).toBe('Old Name');
  });

  it('SetMyProfileName_MergesName_PreservesResumeAndLetter', async () => {
    await api.setMyProfileName('u1', 'Nora Kessler');
    expect(api.saveTalentDocuments).toHaveBeenCalledWith('u1', {
      contact: { name: 'Nora Kessler', email: 'nora@example.de' },
      resume: { summary: 'keep me' },
      letter: { betreff: 'Bewerbung' },
      style: { accent: '#111111' },
    });
  });

  it('GetMyProfileName_NoDocuments_ReturnsEmpty', async () => {
    api.getTalentDocuments = vi.fn().mockRejectedValue(new Error('404'));
    expect(await api.getMyProfileName('u1')).toBe('');
  });
});
