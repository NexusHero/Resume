import React from 'react';

export type PipelineStage = 'new' | 'review' | 'interview' | 'offer' | 'hired' | 'rejected';

/** Stage key → German label + status color tokens. Exported for column headers etc. */
export declare const STAGES: Record<PipelineStage, {
  label: string; color: string; soft: string; border: string; strong: string;
}>;

/**
 * The pipeline-stage chip — the most-used status indicator in the recruiting
 * product. A leading dot over a soft fill, mono label.
 */
export interface StatusBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Pipeline stage. @default 'new' @kind variant */
  status?: PipelineStage;
  /** Override the stage's German label. */
  label?: React.ReactNode;
  /** Show the leading status dot. @default true */
  dot?: boolean;
  /** @default 'md' @kind size */
  size?: 'sm' | 'md';
  style?: React.CSSProperties;
}

export function StatusBadge(props: StatusBadgeProps): JSX.Element;
