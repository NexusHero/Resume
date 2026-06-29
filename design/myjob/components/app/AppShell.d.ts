import React from 'react';

export interface AppNavItem {
  /** Stable id; compared against `active` and passed to `onNav`. */
  id: string;
  /** Visible label (humanist sans — never mono). */
  label: string;
  /** Icon name from the Icon set. */
  icon: string;
  /** Optional count badge. */
  badge?: number;
}

export interface AppAccount {
  name: string;
  /** Avatar photo; falls back to initials on ink. */
  src?: string;
  /** Small mono caption, e.g. "Me · +3 talents" or "Bewerber:in". */
  meta?: string;
}

/**
 * AppShell — the one shell both products share. Desktop = ink rail + topbar
 * (+ optional right-side detail panel); mobile = bottom tab bar. Settings and
 * account sit at the rail foot as a utility, not a primary destination.
 */
export interface AppShellProps {
  /** Rail (desktop-first) or bottom tabs (mobile-first). @default 'rail' @kind variant */
  posture?: 'rail' | 'tabs';
  /** Brand lockup + nav copy. @default 'applicant' @kind variant */
  product?: 'recruit' | 'applicant';
  /** Primary destinations (6 by convention; tabs uses the first 5). */
  nav: AppNavItem[];
  /** Active destination id. */
  active?: string;
  /** Navigate. Receives a nav id, or '__settings' / '__account' from the foot. */
  onNav?: (id: string) => void;
  /** Persona footer (rail) / top-bar avatar (tabs). */
  account?: AppAccount;
  /** Foot settings label. @default 'Einstellungen' */
  settingsLabel?: string;
  /** Topbar title (desktop) / app-bar title (mobile). */
  title?: string;
  /** Topbar subtitle (desktop only). */
  subtitle?: string;
  /** Show the topbar search field (desktop). @default false */
  search?: boolean;
  searchPlaceholder?: string;
  searchValue?: string;
  onSearch?: (value: string) => void;
  /** Topbar / app-bar trailing actions. */
  actions?: React.ReactNode;
  /** Right-side detail panel (desktop) — keeps lists from being half-empty. */
  detail?: React.ReactNode;
  /** Main content. */
  children?: React.ReactNode;
}

export function AppShell(props: AppShellProps): JSX.Element;
