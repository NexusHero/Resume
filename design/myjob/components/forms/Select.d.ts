import React from 'react';

export type SelectOption = string | { value: string; label: React.ReactNode };

/** Styled native <select> with a custom chevron and the shared focus glow. */
export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  /** Uppercase mono label above the field. */
  label?: React.ReactNode;
  /** Options as plain strings or {value,label} objects. */
  options: SelectOption[];
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  wrapStyle?: React.CSSProperties;
  style?: React.CSSProperties;
}

export function Select(props: SelectProps): JSX.Element;
