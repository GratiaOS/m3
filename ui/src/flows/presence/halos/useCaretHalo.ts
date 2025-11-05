import { useEffect } from 'react';
import { pulse$ } from '@gratiaos/presence-kernel';

const ACTIVE_ATTR = 'data-halo-active';
const CARET_ATTR = 'data-caret-active';
const DIM_AFTER_MS = 600; // roughly two shared beats by default tempo

export function useCaretHalo() {
  useEffect(() => {
    if (typeof document === 'undefined') return undefined;

    let focused: HTMLElement | null = null;
    let lastInputAt = 0;

    const setCaretState = (el: HTMLElement | null, on: boolean) => {
      if (!el || !isHaloTarget(el)) return;
      if (on) {
        el.setAttribute(ACTIVE_ATTR, '');
        el.setAttribute(CARET_ATTR, '');
      } else {
        el.removeAttribute(CARET_ATTR);
      }
    };

    const onFocusIn = (event: FocusEvent) => {
      const target = event.target as HTMLElement | null;
      if (isEditable(target) && isHaloTarget(target)) {
        focused = target;
        setCaretState(focused, true);
      } else {
        focused = null;
      }
    };

    const onFocusOut = (event: FocusEvent) => {
      const target = event.target as HTMLElement | null;
      if (focused && target === focused) {
        focused.removeAttribute(CARET_ATTR);
        focused.removeAttribute(ACTIVE_ATTR);
        focused = null;
      }
    };

    const onInput = (event: Event) => {
      const target = event.target as HTMLElement | null;
      if (!focused || target !== focused) return;
      lastInputAt = performance.now();
      setCaretState(focused, true);
    };

    const unsubscribePulse = pulse$.subscribe(() => {
      if (!focused) return;
      if (performance.now() - lastInputAt > DIM_AFTER_MS) {
        focused.removeAttribute(CARET_ATTR);
      } else {
        focused.setAttribute(CARET_ATTR, '');
      }
    });

    document.addEventListener('focusin', onFocusIn, true);
    document.addEventListener('focusout', onFocusOut, true);
    document.addEventListener('input', onInput, true);

    return () => {
      if (typeof unsubscribePulse === 'function') unsubscribePulse();
      document.removeEventListener('focusin', onFocusIn, true);
      document.removeEventListener('focusout', onFocusOut, true);
      document.removeEventListener('input', onInput, true);
    };
  }, []);
}

const TEXTUAL_INPUT_TYPES = new Set(['', 'text', 'search', 'email', 'url', 'tel', 'password', 'number']);

function isEditable(el: HTMLElement | null): el is HTMLElement {
  if (!el) return false;
  if (el.isContentEditable) return true;
  const tag = el.tagName;
  if (tag === 'TEXTAREA') return true;
  if (tag === 'INPUT') {
    const type = (el.getAttribute('type') ?? '').toLowerCase();
    return TEXTUAL_INPUT_TYPES.has(type);
  }
  return false;
}

function isHaloTarget(el: HTMLElement | null): el is HTMLElement {
  if (!el) return false;
  return el.classList.contains('halo') || el.hasAttribute('data-halo');
}
