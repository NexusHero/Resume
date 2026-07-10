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

export const PAIRS = [
  // Body / label / meta text on every light surface it can sit on.
  ...LIGHT_SURFACES.flatMap((bg) =>
    TEXT_TOKENS.map((fg) => ({ fg, bg, min: TEXT, note: `${fg} on ${bg}` })),
  ),

  // Chip text on its own soft tint (status + semantic badges — the "strong"
  // colour is the label, the "soft" colour is the fill).
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

  // UI (3:1). Resting borders (--border / --border-strong) are deliberately
  // subtle — the calm, light identity depends on it, and WCAG 1.4.11 is carried
  // by the *interactive* state: the focus ring must reach 3:1, not the hairline.
  // So we guard the focus/active outline and the icon strokes, which are the
  // marks that actually convey state and meaning.
  { fg: '--accent', bg: '--surface-card', min: UI, note: 'focus ring / active outline' },
  { fg: '--accent', bg: '--surface-sunk', min: UI, note: 'focus ring on sunk surface' },
  { fg: '--text-soft', bg: '--surface-card', min: UI, note: 'icon stroke on card' },
  { fg: '--text-soft', bg: '--surface-sunk', min: UI, note: 'icon stroke on sunk surface' },
];

/* Theme fixtures. Each entry is { name, overrides } where overrides is a Map of
 * token→value applied on top of the base tokens before auditing — so adding a
 * theme (e.g. the dark mode from #196, or the Signal/Graphite accents) is one
 * more fixture, not a second audit. The base (default Blueprint) needs none. */
export const THEMES = [{ name: 'default (Blueprint)', overrides: new Map() }];
