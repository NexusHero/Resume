import React from 'react';

export interface MatchTier {
  /** Tier name, e.g. "Pflicht-Skills" / "Bonus-Skills". */
  label: string;
  /** Skills met. With `max`, rendered as a `value/max` fraction. */
  value: number;
  /** Total skills in the tier. Omit to treat `value` as a raw percent. */
  max?: number;
}

/**
 * MatchIndicator — the candidate-FIT signal and the brand's ownable idea.
 * Radial by design so it never reads like the linear neutral ProgressBar
 * (which shows mandate *fill*). Rides the accent; optional two-tier breakdown.
 */
export interface MatchIndicatorProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Overall match score, 0–100. @kind other */
  value?: number;
  /** Two-tier breakdown (Pflicht- then Bonus-Skills). Shown beside the ring. */
  tiers?: MatchTier[];
  /** ring = full dial (+ tiers); chip = compact pill for rows; bare = ring only. @default 'ring' @kind variant */
  variant?: 'ring' | 'chip' | 'bare';
  /** @default 'md' @kind size */
  size?: 'sm' | 'md' | 'lg';
  /** Caption (chip suffix / ring aria). @default 'Match' */
  label?: React.ReactNode;
  style?: React.CSSProperties;
}

export function MatchIndicator(props: MatchIndicatorProps): JSX.Element;
