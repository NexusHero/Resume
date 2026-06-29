import React from 'react';
import { IconName } from '../core/Icon';

/**
 * Text input wrapped in its label, with an optional leading icon, hint and
 * error. Focus draws the accent border + glow.
 */
export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Uppercase mono label above the field. */
  label?: React.ReactNode;
  /** Leading glyph inside the field. */
  icon?: IconName;
  /** Helper text under the field. */
  hint?: React.ReactNode;
  /** Error text — overrides hint and turns the field red. */
  error?: React.ReactNode;
  /** Styles on the wrapping <label>. */
  wrapStyle?: React.CSSProperties;
  /** Styles on the <input> element. */
  style?: React.CSSProperties;
}

export function Input(props: InputProps): JSX.Element;
