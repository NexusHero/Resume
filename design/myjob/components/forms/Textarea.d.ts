import React from 'react';

/** Multiline text input. Same focus treatment as Input; vertically resizable. */
export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  /** Uppercase mono label above the field. */
  label?: React.ReactNode;
  /** Helper text under the field. */
  hint?: React.ReactNode;
  /** Initial row count. @default 4 */
  rows?: number;
  wrapStyle?: React.CSSProperties;
  style?: React.CSSProperties;
}

export function Textarea(props: TextareaProps): JSX.Element;
