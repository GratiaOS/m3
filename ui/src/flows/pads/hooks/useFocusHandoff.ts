import { useEffect, useRef } from 'react';
import { activePadId$, activeManifest$, scene$, type PadManifest } from '@gratiaos/pad-core';
import { announce } from '../../presence/a11y/LiveRegion';

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
  const lastSpoken = useRef<string>('');

  useEffect(() => {
    let first = true; // skip initial mount noise
    const mqReduced = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    const reduced = mqReduced?.matches ?? false;

    let currentPad: string | null = activePadId$.value;
    let currentManifest: PadManifest | null = activeManifest$.value;
    let currentScene: string | null = scene$.value;

    let raf1: number | null = null;
    let raf2: number | null = null;

    const attempt = () => {
      if (!currentPad) return;
      if (first) {
        // First valid pad presence after mount; don't focus/announce.
        first = false;
        return;
      }

      // Respect ongoing typing / active halo interactions.
      const active = document.activeElement as HTMLElement | null;
      if (active && (active.matches('input,textarea,[contenteditable=true]') || active.hasAttribute('data-halo-active'))) {
        return;
      }

      const root = sceneRef.current;
      if (!root) return;

      // Two frames to allow the scene DOM to mount/bloom.
      if (raf1) cancelAnimationFrame(raf1);
      if (raf2) cancelAnimationFrame(raf2);
      raf1 = requestAnimationFrame(() => {
        raf2 = requestAnimationFrame(() => {
          const target = getFirstFocusable(root);
          if (!target) return;

          try {
            target.focus({ preventScroll: true });
          } catch {
            /* swallow */
          }

            // Halo burst (skip glow on reduced-motion)
          if (!reduced) {
            target.setAttribute('data-halo-burst', '');
            setTimeout(() => target.removeAttribute('data-halo-burst'), 240);
          }

          // Build polite announcement message.
          const padName = currentManifest?.title || 'Pad';
          const sceneName = resolveSceneName(currentManifest, currentScene) || 'Scene';
          const ctl = accessibleName(target);
          const msg = `${padName} • ${sceneName} — Focused: ${ctl}.`;
          if (msg !== lastSpoken.current) {
            lastSpoken.current = msg;
            announce(msg);
          }
        });
      });
    };

    const unsubPad = activePadId$.subscribe((id) => {
      currentPad = id;
      attempt();
    });
    const unsubManifest = activeManifest$.subscribe((m) => {
      currentManifest = m;
    });
    const unsubScene = scene$.subscribe((s) => {
      currentScene = s;
      attempt();
    });

    return () => {
      unsubPad();
      unsubManifest();
      unsubScene();
      if (raf1) cancelAnimationFrame(raf1);
      if (raf2) cancelAnimationFrame(raf2);
    };
  }, [sceneRef]);
}

// ── Helpers ──────────────────────────────────────────────────────────────

function resolveSceneName(manifest: PadManifest | null, sceneId: string | null): string | null {
  if (!sceneId) return null;
  const title = manifest?.scenes?.find((s) => s.id === sceneId)?.title;
  return title || sceneId;
}

function accessibleName(el: HTMLElement): string {
  const aria = el.getAttribute('aria-label');
  if (aria) return aria.trim();
  const id = el.getAttribute('id');
  if (id) {
    const lab = document.querySelector<HTMLLabelElement>(`label[for="${id}"]`);
    if (lab && lab.textContent) return lab.textContent.trim();
  }
  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
    if (el.placeholder) return el.placeholder.trim();
  }
  const title = el.getAttribute('title');
  if (title) return title.trim();
  const text = (el.textContent || '').trim();
  return text.slice(0, 60) || 'control';
}
