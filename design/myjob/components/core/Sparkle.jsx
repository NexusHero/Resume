import React from 'react';

/**
 * Sparkle — the AI-signature glyph. Marks everything the Matching-KI /
 * Assistent produces (KI-Callouts, „Warum"-Begründungen, Magic-Buttons).
 * Deterministic UI never wears it. Single source of truth — screens import
 * this instead of local copies.
 */
export function Sparkle({ size = 16, style = {} }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden="true" style={{ display: 'block', flexShrink: 0, ...style }}>
      <path d="M12 2l1.6 5.1a5 5 0 0 0 3.3 3.3L22 12l-5.1 1.6a5 5 0 0 0-3.3 3.3L12 22l-1.6-5.1a5 5 0 0 0-3.3-3.3L2 12l5.1-1.6a5 5 0 0 0 3.3-3.3L12 2z"></path>
      <path d="M19 3l.6 1.9a2 2 0 0 0 1.3 1.3L22.8 7l-1.9.6a2 2 0 0 0-1.3 1.3L19 11l-.6-1.9a2 2 0 0 0-1.3-1.3L15.2 7l1.9-.6a2 2 0 0 0 1.3-1.3L19 3z" opacity="0.7"></path>
    </svg>
  );
}
