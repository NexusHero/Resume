import React from 'react';

/**
 * The AI-signature glyph — marks KI-produced content (callouts, match
 * reasons, magic buttons). Never on deterministic UI.
 */
export interface SparkleProps {
  /** Icon size in px. @default 16 */
  size?: number;
  style?: React.CSSProperties;
}

export function Sparkle(props: SparkleProps): JSX.Element;
