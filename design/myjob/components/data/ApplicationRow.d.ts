import React from 'react';
import { PipelineStage } from './StatusBadge';

/**
 * ApplicationRow — the canonical "one application" row for the applicant app
 * (myJob ▸ Bewerbungen). One home for what used to be three lists. The POSITION
 * is the single hero signal; mono is reserved for the ID, match % and time.
 */
export interface ApplicationRowProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Job title — the hero signal (display font). */
  position: string;
  /** Employer name. */
  company: string;
  /** City / "Remote" etc. Optional. */
  location?: string;
  /** Application reference, mono. e.g. "BEW-1042". */
  appId?: string;
  /** Company logo src. Falls back to a rounded-square initials tile. */
  logo?: string;
  /** Match score 0–100 → rendered as a MatchIndicator chip. Omit to hide. */
  match?: number;
  /** Pipeline stage. @default 'new' @kind variant */
  status?: PipelineStage;
  /** Relative timestamp, mono. e.g. "vor 2 Tagen". */
  when?: string;
  /** Selected (accent fill + left bar) — pairs with a right-side detail panel. */
  selected?: boolean;
  onClick?: () => void;
  style?: React.CSSProperties;
}

export function ApplicationRow(props: ApplicationRowProps): JSX.Element;
