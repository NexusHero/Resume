/* The token contrast contract (#198): every foreground×background token pair
 * the recruiting kit actually paints, with its WCAG floor. The guard test
 * (contrast.test.js) enforces these so a token edit can't silently drop text
 * below AA. Keep this in sync when a component introduces a new colour pairing.
 *
 * Thresholds (WCAG 2.1): 4.5 for normal text (all body/label/meta text in this
 * app is < 24px regular / < 18.66px bold), 3.0 for large text, UI borders and
 * icon strokes.
 */

const TEXT = 4.5;
const UI = 3.0;

/* The light working surfaces text can land on. Text-bearing surfaces are the
 * sheet colours (card/subtle/sunk) and the app canvas; --surface-page is the
 * deepest backdrop *behind* sheets and never carries body text. */
const LIGHT_SURFACES = ['--surface-card', '--surface-subtle', '--surface-sunk', '--surface-app'];
const TEXT_TOKENS = ['--text-heading', '--text-body', '--text-muted', '--text-soft'];

// Body / label / meta text on every surface it can sit on. Both tokens resolve
// to solid colours in light AND dark, so this set is audited in both themes.
export const TEXT_SURFACE_PAIRS = LIGHT_SURFACES.flatMap((bg) =>
  TEXT_TOKENS.map((fg) => ({ fg, bg, min: TEXT, note: `${fg} on ${bg}` })),
);

// Non-text UI (3:1) — solid in both themes, so also audited in both. The accent
// "detail" mark (active outline / icon accent) is --accent-strong, which
// lightens to --accent-on-dark in dark mode so it stays perceivable there.
export const UI_PAIRS = [
  { fg: '--accent-strong', bg: '--surface-card', min: UI, note: 'accent detail / active outline on card' },
  { fg: '--accent-strong', bg: '--surface-sunk', min: UI, note: 'accent detail on sunk surface' },
  { fg: '--text-soft', bg: '--surface-card', min: UI, note: 'icon stroke on card' },
  { fg: '--text-soft', bg: '--surface-sunk', min: UI, note: 'icon stroke on sunk surface' },
];

export const PAIRS = [
  ...TEXT_SURFACE_PAIRS,

  // Chip text on its own soft tint (status + semantic badges — the "strong"
  // colour is the label, the "soft" colour is the fill). Light theme only: in
  // dark these fills are translucent color-mix() over the surface, out of scope
  // for the static solid-colour audit.
  { fg: '--status-new-strong', bg: '--status-new-soft', min: TEXT, note: 'new badge' },
  { fg: '--status-review-strong', bg: '--status-review-soft', min: TEXT, note: 'review badge' },
  { fg: '--status-interview-strong', bg: '--status-interview-soft', min: TEXT, note: 'interview badge' },
  { fg: '--status-offer-strong', bg: '--status-offer-soft', min: TEXT, note: 'offer badge' },
  { fg: '--status-hired-strong', bg: '--status-hired-soft', min: TEXT, note: 'hired badge' },
  { fg: '--status-rejected-strong', bg: '--status-rejected-soft', min: TEXT, note: 'rejected badge' },
  { fg: '--success-strong', bg: '--success-soft', min: TEXT, note: 'success chip (match ≥80, met skill)' },
  { fg: '--accent-strong', bg: '--accent-soft', min: TEXT, note: 'accent-soft chip / active tab' },

  // Filled accent button: white label on the solid accent.
  { fg: '--accent-contrast', bg: '--accent', min: TEXT, note: 'primary CTA label' },

  // Resting borders (--border / --border-strong) are deliberately subtle — the
  // calm, light identity depends on it, and WCAG 1.4.11 is carried by the
  // *interactive* state: the focus ring reaches 3:1, not the hairline. So the
  // UI floor is guarded on the focus/active outline and the icon strokes.
  ...UI_PAIRS,
];

/* The subset that stays solid-colour in dark mode (text↔surface + UI). The dark
 * chip fills are translucent color-mix() over the surface — verified visually,
 * out of scope for this static audit. */
export const DARK_PAIRS = [...TEXT_SURFACE_PAIRS, ...UI_PAIRS];
