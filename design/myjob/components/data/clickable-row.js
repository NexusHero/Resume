/**
 * Element + props for a list row that may be clickable. A clickable row renders
 * as a native <button> (keyboard focus and screen-reader semantics for free);
 * the style resets keep it looking exactly like the plain <div> row.
 */
const BUTTON_RESET = {
  appearance: 'none',
  width: '100%',
  margin: 0,
  textAlign: 'left',
  font: 'inherit',
  color: 'inherit',
  borderTop: 'none',
  borderRight: 'none',
};

export function clickableRow(onClick) {
  return onClick
    ? { Row: 'button', type: 'button', reset: BUTTON_RESET }
    : { Row: 'div', type: undefined, reset: {} };
}
