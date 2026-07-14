import React from 'react';

/**
 * The primary action control — mono label, pill shape (the brand's
 * "engineering signature"). Five intent variants and three grid-aligned sizes.
 *
 */
export interface ButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'type'> {
  /** Intent / emphasis. @default 'primary' @kind variant */
  variant?: 'primary' | 'ink' | 'outline' | 'ghost' | 'danger';
  /** Grid-aligned size. @default 'md' @kind size */
  size?: 'sm' | 'md' | 'lg';
  /** Leading element (usually an <Icon/>). */
  iconLeft?: React.ReactNode;
  /** Trailing element (usually an <Icon/>). */
  iconRight?: React.ReactNode;
  /** Stretch to full container width. @default false */
  block?: boolean;
  disabled?: boolean;
  /** Demo / not-yet-wired action: dashed border, dimmed, help cursor, click suppressed, honest tooltip. Use instead of styling a dead action like a live one. @default false */
  demo?: boolean;
  type?: 'button' | 'submit' | 'reset';
  style?: React.CSSProperties;
  children?: React.ReactNode;
}

export function Button(props: ButtonProps): JSX.Element;
