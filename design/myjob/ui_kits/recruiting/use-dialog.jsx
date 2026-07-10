/* window.useDialog — modal accessibility in one hook (#203). Given a ref to the
   dialog element and an onClose callback it: moves focus into the dialog on
   open (first focusable, else the container), traps Tab inside it, closes on
   Escape, and restores focus to whatever was focused before it opened. Pair with
   role="dialog" + aria-modal="true" + an accessible name on the element. */
const React = window.React;

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

function focusableIn(root) {
  return root ? Array.from(root.querySelectorAll(FOCUSABLE)) : [];
}

function useDialog(ref, onClose) {
  React.useEffect(() => {
    const previouslyFocused =
      typeof document !== 'undefined' ? document.activeElement : null;
    const root = ref.current;
    const initial = focusableIn(root);
    if (initial[0]) initial[0].focus();
    else if (root) {
      if (!root.hasAttribute('tabindex')) root.setAttribute('tabindex', '-1');
      root.focus();
    }

    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key === 'Tab') {
        const f = focusableIn(ref.current);
        if (f.length === 0) {
          e.preventDefault();
          return;
        }
        const first = f[0];
        const last = f[f.length - 1];
        const active = document.activeElement;
        if (e.shiftKey && (active === first || !ref.current.contains(active))) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && active === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('keydown', onKey, true);
      if (previouslyFocused && typeof previouslyFocused.focus === 'function') {
        previouslyFocused.focus();
      }
    };
    // onClose is captured once on open; callers pass a stable handler.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ref]);
}

Object.assign(window, { useDialog });
