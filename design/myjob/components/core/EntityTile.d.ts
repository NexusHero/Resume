import React from 'react';

/**
 * EntityTile — the one media primitive for an item in a list: a circular Avatar
 * for a person, a rounded-square initials/logo tile for a company. Replaces the
 * duplicated company-tile that ApplicationRow and PositionCard each carried.
 */
export interface EntityTileProps extends React.HTMLAttributes<HTMLElement> {
  /** person = circular avatar; company = rounded-square tile. @default 'company' @kind variant */
  type?: 'person' | 'company';
  /** Display name — drives the initials fallback. */
  name?: string;
  /** Photo (person) or logo (company) src. Falls back to initials. */
  src?: string;
  /** @default 'md' @kind size */
  size?: 'sm' | 'md' | 'lg' | 'xl' | number;
  /** Corner radius for the company tile. @default 'var(--radius-md)' */
  radius?: string;
  style?: React.CSSProperties;
}

export function EntityTile(props: EntityTileProps): JSX.Element;
