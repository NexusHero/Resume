import React from 'react';

/**
 * Candidate / user avatar with an initials fallback drawn behind the image.
 * Circle by default; pass a square `radius` for a document portrait.
 */
export interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Image URL. If it fails to load, the initials fallback shows. */
  src?: string;
  /** Full name — drives the title + auto initials. */
  name?: string;
  /** Override the computed initials. */
  initials?: string;
  /** Named size token or an explicit pixel number. @default 'md' */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | number;
  /** Corner radius. @default '50%' (circle). Use a token for a square portrait. */
  radius?: string;
  /** Draw an accent focus ring. @default false */
  ring?: boolean;
  style?: React.CSSProperties;
}

export function Avatar(props: AvatarProps): JSX.Element;
