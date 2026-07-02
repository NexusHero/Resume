import React from 'react';
import { PipelineStage } from './StatusBadge';

/** A required skill on a posting. A bare string is a neutral requirement; with
 *  `met` set it renders against a candidate (✓ has it / gap). */
export type PositionSkill = string | { name: string; met?: boolean };

/**
 * PositionCard — the "Stelle" object: the trackable job posting a recruiter
 * applies a candidate TO. Carries the description, skill requirements and —
 * first-class for the DACH market — its COUNTRY and SOURCE, so Swiss postings
 * (jobs.ch / jobup.ch / job-room.ch, CHF, Pensum %) are modelled natively.
 */
export interface PositionCardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Job title — the hero (display font). */
  title: string;
  company: string;
  /** Company logo; falls back to a rounded-square initials tile. */
  logo?: string;
  /** City, e.g. "Zürich". */
  location?: string;
  /** Country — drives the flag chip and (with source) the DACH sourcing. @kind variant */
  country?: 'DE' | 'AT' | 'CH';
  /** Where the posting came from, e.g. "jobs.ch", "job-room.ch", "LinkedIn". */
  source?: string;
  /** Provenance. 'manual' wears a dashed "Manuell erstellt" badge — a posting
   *  the recruiter created by hand (e.g. a jobs.ch job not in the auto results),
   *  visibly distinct from board-sourced postings. @default 'source' @kind variant */
  origin?: 'source' | 'manual';
  /** Workload / Pensum, e.g. "80–100%" (Swiss-relevant). */
  pensum?: string;
  /** Salary band, e.g. "CHF 110–130k" or "€ 75–90k". */
  salary?: string;
  /** Relative posting time, e.g. "2 days ago". */
  posted?: string;
  /** Required skills. Pass `{name, met}` in a candidate context to mark the gap. */
  skills?: PositionSkill[];
  /** Candidate match 0–100 → renders a MatchIndicator chip (matched context). */
  match?: number;
  /** Pipeline stage, when the posting already has an application. @kind variant */
  status?: PipelineStage;
  /** Primary action label, e.g. "Suhay bewerben". @default 'Bewerber bewerben' */
  applyLabel?: string;
  /** Apply-on-behalf action. Omit to hide the primary button. */
  onApply?: () => void;
  /** Open the job description. Omit to hide. */
  onView?: () => void;
  selected?: boolean;
  onClick?: () => void;
  style?: React.CSSProperties;
}

export function PositionCard(props: PositionCardProps): JSX.Element;
