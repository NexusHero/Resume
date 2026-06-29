import React from 'react';
import { IconName } from '../core/Icon';

/**
 * A KPI tile for dashboards — big display number, mono label, optional delta
 * trend and an accent icon chip.
 *
 * @startingPoint section="Data" subtitle="Dashboard KPI tile — number, delta, icon" viewport="700x150"
 */
export interface StatCardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Small uppercase mono label. */
  label: React.ReactNode;
  /** The headline value (string or number). */
  value: React.ReactNode;
  /** Change text, e.g. "+12%". Omit to hide the trend. */
  delta?: React.ReactNode;
  /** Trend direction — colors + arrow. @default 'up' */
  dir?: 'up' | 'down';
  /** Accent icon shown top-right. */
  icon?: IconName;
  style?: React.CSSProperties;
}

export function StatCard(props: StatCardProps): JSX.Element;
