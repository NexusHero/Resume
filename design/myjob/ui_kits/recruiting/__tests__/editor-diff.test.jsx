/* EditorDiff (ADR-0060 §8) — pure diff renderer over `diff` (jsdiff ^9). */
import { describe, it, expect, beforeAll } from 'vitest';
import { render } from '@testing-library/react';

let EditorDiff;

beforeAll(async () => {
  await import('../EditorDiff.jsx');
  EditorDiff = window.EditorDiff;
});

describe('EditorDiff', () => {
  it('EditorDiff_Text_WordsMarkedAsInsertDelete', () => {
    const { container } = render(
      <EditorDiff kind="text" before="Lead Engineer" after="Senior Engineer" />,
    );
    const ins = container.querySelector('ins');
    const del = container.querySelector('del');
    expect(ins).toBeTruthy();
    expect(del).toBeTruthy();
    expect(ins.textContent).toContain('Senior');
    expect(del.textContent).toContain('Lead');
  });

  it('EditorDiff_Text_Unchanged_RendersSingleSpan', () => {
    const { container } = render(<EditorDiff kind="text" before="Engineer" after="Engineer" />);
    expect(container.querySelector('ins')).toBeNull();
    expect(container.querySelector('del')).toBeNull();
    expect(container.textContent).toContain('Engineer');
  });

  it('EditorDiff_Arrays_AddedAndRemovedLinesMarked', () => {
    const added = render(
      <EditorDiff kind="array" before={['React', 'Go']} after={['React', 'Go', 'Rust']} />,
    );
    expect(added.container.querySelector('ins').textContent).toContain('Rust');

    const removed = render(
      <EditorDiff kind="array" before={['React', 'Go', 'Docker']} after={['React', 'Go']} />,
    );
    expect(removed.container.querySelector('del').textContent).toContain('Docker');
  });

  it('EditorDiff_Arrays_ReorderOnly_NoSpuriousEdits', () => {
    const { container } = render(
      <EditorDiff kind="array" before={['React', 'Go']} after={['Go', 'React']} />,
    );
    expect(container.querySelector('ins')).toBeNull();
    expect(container.querySelector('del')).toBeNull();
  });

  it('EditorDiff_Arrays_CaseChange_NoSpuriousEdits', () => {
    const { container } = render(
      <EditorDiff kind="array" before={['React']} after={['react']} />,
    );
    expect(container.querySelector('ins')).toBeNull();
    expect(container.querySelector('del')).toBeNull();
  });

  it('EditorDiff_SkillGroups_RendersLabelAndItems', () => {
    const { getByText } = render(
      <EditorDiff kind="skills" after={[{ label: 'Languages', items: ['Rust', 'Go'] }]} />,
    );
    expect(getByText('Languages')).toBeTruthy();
    expect(getByText('Rust')).toBeTruthy();
    expect(getByText('Go')).toBeTruthy();
  });

  it('EditorDiff_GroundingText_HighlightsUnsupportedClaim', () => {
    const { container } = render(
      <EditorDiff
        kind="text"
        before=""
        after="I use Kubernetes daily."
        unsupported={[{ kind: 'skill', text: 'Kubernetes' }]}
      />,
    );
    const mark = container.querySelector('mark');
    expect(mark).toBeTruthy();
    expect(mark.textContent).toBe('Kubernetes');
  });
});
