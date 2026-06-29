import React from 'react';

/**
 * A small mono label chip — skills, tags, counts. Pick a light-surface variant
 * (`outline`/`subtle`/`solid`/`soft`) or a dark-shell one (`glass`/`light`).
 */
export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** @default 'outline' @kind variant */
  variant?: 'outline' | 'subtle' | 'solid' | 'soft' | 'glass' | 'light';
  /** @default 'md' @kind size */
  size?: 'sm' | 'md';
  /** Optional leading element (e.g. an <Icon/>). */
  icon?: React.ReactNode;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}

export function Badge(props: BadgeProps): JSX.Element;
