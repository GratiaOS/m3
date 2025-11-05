import { useEffect } from 'react';
import { activePadId$ } from '@gratiaos/pad-core';

// Simple ref-like contract for interoperability with useRef callbacks
export type RefLike = { current: HTMLElement | null };

// Ordered focus candidates. Earlier selectors have priority.
const FOCUS_SELECTORS = [
  '[data-handoff]', // explicit opt-in priority target
  '[autofocus]',
  'input:not([type=hidden]):not([disabled])',
  'textarea:not([disabled])',
  '[contenteditable=true]',
  'button:not([disabled])',
  'a[href]',
  '[role=button]',
].join(',');

function getFirstFocusable(root: HTMLElement): HTMLElement | null {
  // Prefer visible & not inert (offsetParent is null for display:none / detached / visibility:hidden ancestors)
  const list = Array.from(root.querySelectorAll<HTMLElement>(FOCUS_SELECTORS)).filter((el) => el.offsetParent !== null && !el.hasAttribute('inert'));
  return list[0] ?? null;
}

/**
 * Polite focus handoff on pad scene changes.
 * Skips initial mount, avoids stealing from active typing, and emits a brief halo burst.
 */
export function useFocusHandoff(sceneRef: RefLike) {
  useEffect(() => {
    let first = true; // skip initial mount for noise reduction
    const mqReduced = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    const reduced = mqReduced?.matches ?? false;

    const unsubscribe = activePadId$.subscribe((id: string | null) => {
      if (!id) return;

      // Skip the first emission (initial load)
      if (first) {
        first = false;
        return;
      }

      // If the user is currently typing / has an engaged halo, don't steal focus
      const active = document.activeElement as HTMLElement | null;
      if (active && (active.matches('input,textarea,[contenteditable=true]') || active.matches('[data-halo-active]'))) {
        return;
      }

      const root = sceneRef.current;
      if (!root) return;

      // Wait 2 frames for scene mount / bloom animations
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const target = getFirstFocusable(root);
          if (!target) return;

          // Focus without scrolling the viewport
          try {
            target.focus({ preventScroll: true });
          } catch {
            /* no-op */
          }

          // Add a short-lived halo burst (reduced-motion safe)
          if (!reduced) {
            target.setAttribute('data-halo-burst', '');
            setTimeout(() => target.removeAttribute('data-halo-burst'), 240);
          }
        });
      });
    });

    return () => {
      try {
        unsubscribe();
      } catch {
        /* no-op */
      }
    };
  }, [sceneRef]);
}
