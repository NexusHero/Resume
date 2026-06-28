import React from 'react';

declare const ICON_NAMES: string[];

export type IconName =
  | 'phone' | 'mail' | 'pin' | 'globe' | 'user' | 'users' | 'id' | 'building'
  | 'briefcase' | 'cap' | 'award' | 'book' | 'code' | 'zap'
  | 'file' | 'fileText' | 'paperclip' | 'download' | 'upload' | 'external'
  | 'home' | 'inbox' | 'grid' | 'columns' | 'list' | 'search' | 'filter' | 'sliders'
  | 'bell' | 'settings' | 'menu' | 'more' | 'moreV'
  | 'chevronDown' | 'chevronUp' | 'chevronRight' | 'chevronLeft'
  | 'arrowRight' | 'arrowLeft' | 'arrowUpRight'
  | 'plus' | 'x' | 'check' | 'checkCircle' | 'xCircle' | 'alert' | 'info'
  | 'edit' | 'trash' | 'star' | 'bookmark' | 'eye' | 'send' | 'message' | 'clock'
  | 'calendar' | 'tag' | 'trend' | 'thumbsUp' | 'heart' | 'logout'
  | 'linkedin' | 'github';

export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Glyph name. See ICON_NAMES for the full list. */
  name: IconName;
  /** Pixel size (width = height). @default 16 */
  size?: number;
  /** SVG stroke width on the 24px grid. @default 1.8 */
  strokeWidth?: number;
  /** Render the filled silhouette instead of the outline — for an active /
   *  selected nav item (iOS .fill / Android selected). Only the nav glyphs
   *  (home, users, briefcase, search, columns, send, fileText) have a solid
   *  twin; others ignore it and stay outline. @default false @kind variant */
  solid?: boolean;
  style?: React.CSSProperties;
}

/**
 * Feather-style line icon — the single icon system for myJob. 24×24 stroke
 * grid, round caps, currentColor. Set color via the parent's `color`.
 */
export function Icon(props: IconProps): JSX.Element;
