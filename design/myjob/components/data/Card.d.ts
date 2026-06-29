import React from 'react';

/**
 * The base surface container — a white sheet with a hairline border and soft
 * shadow. Optional header (`title` + `subtitle` + `action`).
 *
 * @startingPoint section="Data" subtitle="White surface container with optional header" viewport="700x260"
 */
export interface CardProps extends React.HTMLAttributes<HTMLElement> {
  /** Header title (display font). Omit for a header-less card. */
  title?: React.ReactNode;
  /** Sub-line under the title. */
  subtitle?: React.ReactNode;
  /** Right-aligned header slot (button, menu, badge). */
  action?: React.ReactNode;
  /** Pad the body 18px. Set false for flush content (lists, tables). @default true */
  pad?: boolean;
  /** Extra styles on the inner body wrapper. */
  bodyStyle?: React.CSSProperties;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}

export function Card(props: CardProps): JSX.Element;
