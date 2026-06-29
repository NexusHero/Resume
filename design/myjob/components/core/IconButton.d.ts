import React from 'react';
import { IconName } from './Icon';

/**
 * A square, icon-only button for toolbars and row actions. Always supply a
 * `label` — it becomes the tooltip and the accessible name.
 */
export interface IconButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'type'> {
  /** Glyph name (see Icon). */
  icon: IconName;
  /** Tooltip + accessible name. Required. */
  label: string;
  /** @default 'outline' @kind variant */
  variant?: 'outline' | 'ghost' | 'ink' | 'glass' | 'accent';
  /** @default 'md' @kind size */
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  style?: React.CSSProperties;
}

export function IconButton(props: IconButtonProps): JSX.Element;
