/* Q2 — the named text import merges only empty fields and says what it did. */
import { describe, it, expect, beforeAll } from 'vitest';
import { render, screen } from '@testing-library/react';

let mergeTextImport;

beforeAll(async () => {
  await import('../import-merge.js');
  await import('../AiGate.jsx');
  mergeTextImport = window.mergeTextImport;
});

describe('Text import (Q2)', () => {
  it('MergeTextImport_ExistingProfileContactSkillsEducation_AreNeverOverwritten', () => {
    const current = {
      contact: { name: 'Bestehend', email: '' },
      resume: {
        summary: 'Vorhandenes Profil',
        experience: [{ role: 'Dev', company: 'Acme' }],
        education: [{ degree: 'BSc' }],
        skillGroups: [{ label: 'Lang', items: ['Go'] }],
        rawText: '',
      },
    };
    const merged = mergeTextImport(current, {
      contact: { name: 'Neu', email: 'neu@example.com' },
      resume: {
        summary: 'Neues Profil',
        experience: [],
        education: [],
        skillGroups: [],
        rawText: 'Voller CV-Text',
      },
    });
    expect(merged.contact.name).toBe('Bestehend');
    expect(merged.contact.email).toBe('neu@example.com');
    expect(merged.resume.summary).toBe('Vorhandenes Profil');
    expect(merged.resume.experience).toEqual(current.resume.experience);
    expect(merged.resume.skillGroups).toEqual(current.resume.skillGroups);
    expect(merged.resume.rawText).toBe('Voller CV-Text');
  });

  it('EditorImport_TextMode_KeepsExistingRawTextAndSaysSo', () => {
    const merged = mergeTextImport(
      { resume: { rawText: 'Alter Text' } },
      { resume: { rawText: 'Neuer Text' } },
    );
    expect(merged.resume.rawText).toBe('Alter Text');
  });

  it('TextImport_Notice_NamesTheModeAndSaysStructureNeedsAi', () => {
    render(<window.TextImportNotice />);
    expect(screen.getByRole('status')).toHaveTextContent('Text übernommen (ohne KI)');
    expect(screen.getByRole('status')).toHaveTextContent('Stationen und Skills');
  });
});
