import React from 'react';

/** Checkbox with an inline label. Controlled via `checked` + `onChange`. */
export interface CheckboxProps {
  label?: React.ReactNode;
  checked?: boolean;
  onChange?: (next: boolean) => void;
  disabled?: boolean;
  style?: React.CSSProperties;
}

export function Checkbox(props: CheckboxProps): JSX.Element;
