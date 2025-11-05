// ui/src/pads/navigation.ts
// ─────────────────────────────────────────────────────────────────────────────
// Pad navigation helpers (SPA-first, with safe fallback)
// Whisper: "prefer presence; degrade with grace." 🌬
//
// Strategy
// 1) Try in-place route update via pad-core (hash/query/path depending on host config)
// 2) If that throws (e.g. environment/router constraints), fall back to a hard nav
//    using hrefForPad (SSR/CDN safe).
//
// Notes
// • We surface a `via` hint for telemetry/affordance tuning: 'tile' | 'link' | 'hotkey' | string
// • Return value: `true` if we stayed SPA-local; `false` if we triggered hard navigation.
// ─────────────────────────────────────────────────────────────────────────────

import { dispatchPadOpen, hrefForPad, setActivePadId } from '@gratiaos/pad-core';
import type { PadDescriptor } from './pad-types';
import { getPad } from './pad-registry';

/** Navigate directly to a known pad descriptor. */
export function navigateToPadDescriptor(pad: PadDescriptor, via: 'tile' | 'link' | 'hotkey' | string = 'tile'): boolean {
  try {
    // SPA-local: update URL + active pad state without reload
    setActivePadId(pad.id, pad);
    dispatchPadOpen({ id: pad.id, via });
    return true;
  } catch {
    // Fallback: compute a stable href and let the browser navigate
    const target = hrefForPad(pad);
    // Emit the open event before we leave (some hosts record it)
    dispatchPadOpen({ id: pad.id, via });
    window.location.assign(target);
    return false;
  }
}

/** Look up a pad by id and navigate to it. */
export function navigateToPad(padId: string, via?: 'tile' | 'link' | 'hotkey' | string): boolean {
  const pad = getPad(padId);
  if (!pad) return false;
  return navigateToPadDescriptor(pad, via ?? 'tile');
}
