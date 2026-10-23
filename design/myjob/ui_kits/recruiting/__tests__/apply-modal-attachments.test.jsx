/* Fehler 2 — the imported original CV stays visible but is never preselected. */
import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

let ApplyModal;
const ORIGINAL = 'Original-Lebenslauf (Import).pdf';

beforeAll(async () => {
  globalThis.installDesignSystem({
    Checkbox: ({ checked }) => <input type="checkbox" checked={!!checked} readOnly />,
  });
  await import('../use-viewport.jsx');
  await import('../ApplyModal.jsx');
  ApplyModal = window.ApplyModal;
});

beforeEach(() => {
  window.RecruitApi = {
    getTalentDocuments: vi.fn().mockResolvedValue({
      contact: { name: 'Ada Lovelace' },
      resume: { summary: '', experience: [], education: [], skillGroups: [] },
      letter: { absaetze: [] },
    }),
    listAttachments: vi.fn().mockResolvedValue([
      { id: 'a-cert', name: 'Zeugnis.pdf', size: 1000, contentType: 'application/pdf' },
      { id: 'a-orig', name: ORIGINAL, size: 2000, contentType: 'application/pdf' },
    ]),
    talentDossierPreviewPdf: vi.fn(),
    uploadAttachment: vi.fn(),
  };
});

describe('ApplyModal attachments (Fehler 2)', () => {
  it('ApplyModal_ImportedCvAttachment_IsNotPreselected', async () => {
    render(<ApplyModal target={{ talent: { id: 't1', name: 'Ada Lovelace' } }} onClose={vi.fn()} />);

    await screen.findByText('Zeugnis.pdf');
    const cert = screen.getByText('Zeugnis.pdf').closest('label').querySelector('input');
    const original = screen.getByText(ORIGINAL).closest('label').querySelector('input');
    await waitFor(() => expect(cert.checked).toBe(true));
    expect(original.checked).toBe(false);
  });
});
