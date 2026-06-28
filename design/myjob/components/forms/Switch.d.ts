import React from 'react';

/** On/off switch. Controlled via `checked` + `onChange`. Accent track when on. */
export interface SwitchProps {
  label?: React.ReactNode;
  checked?: boolean;
  onChange?: (next: boolean) => void;
  disabled?: boolean;
  style?: React.CSSProperties;
}

export function Switch(props: SwitchProps): JSX.Element;
