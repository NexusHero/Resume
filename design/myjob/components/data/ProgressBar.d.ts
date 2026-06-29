import React from 'react';

/**
 * A thin progress / match-score bar. `value` is 0–100; `tone` picks the fill —
 * a semantic feedback color or a pipeline-stage key.
 */
export interface ProgressBarProps extends React.HTMLAttributes<HTMLDivElement> {
  /** 0–100, clamped. @default 0 */
  value?: number;
  /** Fill color. A token key, or any CSS color string. @default 'accent' @kind variant */
  tone?: 'accent' | 'success' | 'warning' | 'danger' | 'new' | 'review' | 'interview' | 'offer' | 'hired' | string;
  /** Bar thickness in px. @default 6 */
  height?: number;
  /** Show the % on the right of the label row. @default false */
  showValue?: boolean;
  /** Optional label above the bar. */
  label?: React.ReactNode;
  style?: React.CSSProperties;
}

export function ProgressBar(props: ProgressBarProps): JSX.Element;
