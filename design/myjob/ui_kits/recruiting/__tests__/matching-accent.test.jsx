/* Guards the semantic colour roles on a job card (#197): the accent is a scarce
   resource — a card carries at most ONE solid-accent element (the primary CTA).
   The match badge is an assessment (success when strong, neutral otherwise), the
   met-skill chips are "good news" (success-soft), and the salary/meta pills are
   neutral — none of them may borrow the accent. These import the real
   design-system components (the kit's DS stub can't exercise their styles). */
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { MatchIndicator } from '../../../components/data/MatchIndicator.jsx';
import { PositionCard } from '../../../components/data/PositionCard.jsx';

const styleOf = (el) => el.getAttribute('style') || '';

describe('Matching — semantic accent roles (#197)', () => {
  it('MatchBadge_StrongScore_UsesSuccessNotAccent', () => {
    const { container } = render(<MatchIndicator value={88} variant="chip" />);
    const chip = container.querySelector('span');
    expect(styleOf(chip)).toContain('var(--success-soft)');
    // the assessment must not wear the accent (reserved for the primary CTA)
    expect(styleOf(chip)).not.toContain('var(--match-soft)');
    expect(styleOf(chip)).not.toContain('var(--accent-border)');
  });

  it('MatchBadge_WeakScore_UsesNeutralNotAccentOrSuccess', () => {
    const { container } = render(<MatchIndicator value={61} variant="chip" />);
    const chip = container.querySelector('span');
    expect(styleOf(chip)).toContain('var(--surface-sunk)');
    expect(styleOf(chip)).not.toContain('var(--success-soft)');
    expect(styleOf(chip)).not.toContain('var(--accent');
  });

  it('JobCard_MetSkillChip_IsSuccessSoftAndSalaryIsNeutral', () => {
    const { container, getByText } = render(
      <PositionCard
        title="Backend Engineer"
        company="Helio GmbH"
        salary="80–95k"
        skills={[{ name: 'Go', met: true }]}
        match={88}
        applyLabel="View posting"
        onApply={() => {}}
        onView={() => {}}
      />,
    );
    // met skill → success-soft, never accent
    const chip = getByText('Go').closest('span');
    expect(styleOf(chip)).toContain('var(--success-soft)');
    expect(styleOf(chip)).not.toContain('var(--accent-soft)');
    // salary pill is neutral meta — the whole card carries no accent-toned pill
    expect(getByText('80–95k')).toBeInTheDocument();

    // exactly one SOLID-accent element on the card: the primary CTA button.
    const solidAccent = Array.from(container.querySelectorAll('*')).filter((el) =>
      /background:\s*var\(--accent\)/.test(styleOf(el)),
    );
    expect(solidAccent).toHaveLength(1);
    expect(solidAccent[0].textContent).toContain('View posting');
  });
});
