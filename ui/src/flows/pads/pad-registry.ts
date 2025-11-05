/**
 * Garden — Pad registry (UI)
 * -------------------------------------------------------------
 * Single source of truth for pads available in the M3 UI.
 * Each entry pairs a PadManifest‑like descriptor with a concrete
 * React component and a routing hint (hash or path).
 *
 * Consumers:
 *  • PadShelf renders tiles from `PADS`
 *  • PadHost resolves a pad from the current route via `getPadByRoute`
 *  • Keyboard helpers use `meta.keyboard` to register global hints
 *
 * Routing notes:
 *  • Hash mode → #pad=&lt;id&gt; (default key = "pad")
 *  • Path mode → /pads/&lt;leaf&gt; (default prefix = "/pads")
 *
 * Helpers here are intentionally tiny (no window access) so tests
 * can pass explicit strings and verify behavior deterministically.
 */
import TownPad from '@/flows/communication/TownPad';
import FamJamPad from '@/flows/communication/FamJamPad';
import { MemoryPad } from '@/flows/pads/pads/MemoryPad';
import { TownPresencePad } from '@/flows/pads/pads/TownPresencePad';
import { EnergyPad } from '@/flows/pads/pads/EnergyPad';
import { ValueBridgePad } from '@/flows/pads/pads/ValueBridgePad';
import type { PadManifest, PadId } from '@gratiaos/pad-core';
import { registerAll, globalRegistry } from '@gratiaos/pad-core';

type UiPadMeta = {
  component: any; // React component; typed as any here to avoid importing React types
  preview?: any;
  keyboard?: { open?: string };
};

export const PADS: ReadonlyArray<PadManifest<UiPadMeta>> = [
  {
    id: 'memory',
    title: 'Memory Core',
    icon: '🧠',
    tone: 'accent',
    whisper: 'Gratitude and boundary harmonics.',
    route: { mode: 'hash', hashKey: 'pad' },
    scenes: [
      { id: 'gratitude', title: 'Gratitude' },
      { id: 'boundary', title: 'Boundary' },
    ],
    defaultSceneId: 'gratitude',
    meta: {
      component: MemoryPad,
      preview: MemoryPad,
      keyboard: { open: 'g m' },
    },
  },
  {
    id: 'energy',
    title: 'Energy Pad',
    icon: '⚡',
    tone: 'positive',
    whisper: 'Integration and energy balancing rituals.',
    route: { mode: 'hash', hashKey: 'pad' },
    scenes: [{ id: 'integration', title: 'Integration' }],
    defaultSceneId: 'integration',
    meta: {
      component: EnergyPad,
      preview: EnergyPad,
      keyboard: { open: 'g e' },
    },
  },
  {
    id: 'value-bridge',
    title: 'Value Bridge',
    icon: '💸',
    tone: 'accent',
    whisper: 'Ledger, reciprocity, bridge states at a glance.',
    route: { mode: 'hash', hashKey: 'pad' },
    scenes: [{ id: 'ledger', title: 'Ledger' }],
    defaultSceneId: 'ledger',
    meta: {
      component: ValueBridgePad,
      preview: ValueBridgePad,
      keyboard: { open: 'g v' },
    },
  },
  {
    id: 'towns',
    title: 'Town Pad',
    icon: '🌬️',
    tone: 'neutral',
    whisper: 'Soft bulletins that listen back.',
    route: { mode: 'hash', hashKey: 'pad' },
    scenes: [
      { id: 'famjam', title: 'Fam Jam' },
      { id: 'cat-town', title: 'Cat Town' },
    ],
    defaultSceneId: 'famjam',
    meta: {
      component: TownPad,
      preview: TownPresencePad,
      keyboard: { open: 'g t' },
    },
  },
  {
    id: 'famjam',
    title: 'Fam Jam',
    icon: '🎶',
    tone: 'positive',
    whisper: 'Micro-sync rituals sustained by breath.',
    route: { mode: 'hash', hashKey: 'pad' },
    scenes: [{ id: 'famjam', title: 'Fam Jam' }],
    defaultSceneId: 'famjam',
    meta: {
      component: FamJamPad,
      preview: FamJamPad,
      keyboard: { open: 'g f' },
    },
  },
];

registerAll(globalRegistry, PADS);

/** Lookup by id. */
export const getPad = (id: PadId | string): PadManifest<UiPadMeta> | undefined => PADS.find((p) => p.id === id);

/** Build a stable href for a pad (hash by default). */
export function padHref(pad: PadManifest<UiPadMeta>, modeOverride?: 'hash' | 'path'): string {
  const mode = modeOverride ?? pad.route?.mode ?? 'hash';
  if (mode === 'path') {
    const prefix = (pad.route?.pathPrefix ?? '/pads').replace(/\/+$/, '');
    const leaf = (pad.route?.path ?? String(pad.id)).replace(/^\/+/, '');
    return `${prefix}/${leaf}`;
  }
  const key = pad.route?.hashKey ?? 'pad';
  return `#${key}=${encodeURIComponent(String(pad.id))}`;
}

/* ── route matching helpers ───────────────────────────────── */

function normalizePathRoute(route: string): string {
  // keep only pathname, drop query/hash, trim duplicate slashes and trailing slash
  const path = route.split('#')[0].split('?')[0] || '';
  const cleaned = path.replace(/\/{2,}/g, '/').replace(/\/+$/, '');
  return cleaned === '' ? '/' : cleaned;
}

function extractHashParam(route: string, key: string): string | null {
  const hash = route.includes('#') ? route.slice(route.indexOf('#') + 1) : route;
  // Allow inputs like "#pad=towns", "/#pad=towns", "pad=towns"
  const trimmed = hash.replace(/^\/?#/, '').replace(/^\/?/, '');
  const qs = new URLSearchParams(trimmed.includes('=') ? trimmed : '');
  return qs.get(key);
}

/** Resolve a pad descriptor from a route-ish string. */
export const getPadByRoute = (route: string): PadManifest<UiPadMeta> | undefined => {
  const input = route.trim();
  return PADS.find((p) => {
    if (p.route?.mode === 'path') {
      const prefix = (p.route?.pathPrefix ?? '/pads').replace(/\/+$/, '');
      const leaf = (p.route?.path ?? String(p.id)).replace(/^\/+/, '');
      const expected = `${prefix}/${leaf}`;
      return normalizePathRoute(input) === expected;
    }
    if (p.route?.mode === 'hash') {
      const key = p.route?.hashKey ?? 'pad';
      return extractHashParam(input, key) === String(p.id);
    }
    return false;
  });
};
