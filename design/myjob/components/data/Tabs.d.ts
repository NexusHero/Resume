import React from 'react';

export interface TabItem {
  id: string;
  label: React.ReactNode;
  /** Optional count pill on the right of the label. */
  count?: number;
}

/**
 * Underline tab bar. Controlled via `value` + `onChange`. The active tab
 * carries the accent underline and a tinted count pill.
 */
export interface TabsProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange'> {
  tabs: TabItem[];
  /** Active tab id. */
  value: string;
  onChange?: (id: string) => void;
  style?: React.CSSProperties;
}

export function Tabs(props: TabsProps): JSX.Element;
