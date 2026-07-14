import React from 'react';
import { PipelineStage } from './StatusBadge';

/**
 * The core list row of the recruiting product — avatar, name + role, applied
 * position, match score, pipeline status and a timestamp. Composes Avatar +
 * StatusBadge. Hover lifts; the whole row is clickable.
 *
 */
export interface CandidateRowProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onClick'> {
  name: string;
  /** Current role / headline under the name. */
  role?: string;
  /** The position the candidate applied for. */
  position?: React.ReactNode;
  /** Avatar image URL. */
  src?: string;
  /** Pipeline stage chip. @default 'new' */
  status?: PipelineStage;
  /** Match score 0–100 (≥80 renders green). */
  score?: number;
  /** Relative time, e.g. "vor 2 Std". */
  when?: React.ReactNode;
  /** Selected (accent fill + left bar). @default false */
  selected?: boolean;
  onClick?: () => void;
  style?: React.CSSProperties;
}

export function CandidateRow(props: CandidateRowProps): JSX.Element;
