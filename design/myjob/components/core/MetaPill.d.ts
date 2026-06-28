import React from 'react';
import { IconName } from './Icon';

/**
 * A rounded mono pill for a metadata value — date range, location, salary band
 * or count — with an optional leading icon and tabular numerals.
 */
export interface MetaPillProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Leading glyph, or null/false to omit. @default 'calendar' */
  icon?: IconName | null | false;
  /** @default 'default' @kind variant */
  tone?: 'default' | 'accent';
  style?: React.CSSProperties;
  children?: React.ReactNode;
}

export function MetaPill(props: MetaPillProps): JSX.Element;
