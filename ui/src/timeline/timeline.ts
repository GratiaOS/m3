/**
 * Timeline module — headless logic
 * --------------------------------
 * The "timeline" is a lightweight model for how time feels right now.
 * It exposes three practical bands plus an optional "timeless" overlay:
 *
 *  - slow  : gentle pace, space for depth
 *  - flow  : steady forward movement, best default
 *  - heavy : compressed, urgent, high-friction
 *  - timeless (overlay): "no clock" ritual; used rarely to reset
 *
 * This module is headless: no UI, no effects. Components can subscribe
 * however they wish (signals, Zustand, Redux, React state, etc.).
 */

export type TimeBand = 'slow' | 'flow' | 'heavy';
export type TimeOverlay = 'timeless' | null;

export type OneTrueNext = {
  label: string;
  hint?: string;
  source: 'companion' | 'self' | 'rule';
};

export type TimelineState = {
  band: TimeBand;
  overlay: TimeOverlay;
  pinned: boolean;
  next: OneTrueNext | null;
};

/**
 * Known server sources for timeline items.
 * Keep this flexible — unknown strings fall back to a neutral dot.
 */
export type TimelineSource = 'gratitude' | 'emotion' | 'energy' | 'tell' | (string & {});

export const TIME_BAND_ORDER: readonly TimeBand[] = ['slow', 'flow', 'heavy'] as const;

export const TIME_BAND_META: Record<
  TimeBand,
  {
    label: string;
    cadenceSec: number; // recommended beat/step length in seconds
    whisper: string; // short, calm cue
    defaultNext: OneTrueNext;
  }
> = {
  slow: {
    label: 'Slow',
    cadenceSec: 6, // e.g., one breath per step, 6s beat
    whisper: 'unrush the breath — widen the room.',
    defaultNext: { label: 'One-breath reset', hint: 'Inhale 3s · Exhale 3s', source: 'rule' },
  },
  flow: {
    label: 'Flow',
    cadenceSec: 3,
    whisper: 'steady river — choose one thing and move.',
    defaultNext: { label: 'One true next', hint: 'Pick the smallest forward motion', source: 'rule' },
  },
  heavy: {
    label: 'Heavy',
    cadenceSec: 1.5,
    whisper: 'less thinking, more anchoring — shrink the step.',
    defaultNext: { label: 'Micro-step', hint: '10–20s action that proves motion', source: 'rule' },
  },
};

/**
 * Cheap classifier for a band from simple signals.
 * All inputs are optional; missing fields will fall back gracefully.
 *
 * - stress:    0–10 (subjective)
 * - queue:     number of open loops (0+)
 * - tempo:     self-reported current pace in sec/step (higher = slower)
 */
export function classifyBand(input: { stress?: number; queue?: number; tempoSec?: number }): TimeBand {
  const stress = clamp(input.stress ?? 4, 0, 10);
  const queue = Math.max(0, input.queue ?? 3);
  const tempo = clamp(input.tempoSec ?? 3, 0.5, 12);

  // Heuristics:
  // - heavy when stress high OR queue very high OR tempo very fast
  if (stress >= 7 || queue >= 9 || tempo <= 1.8) return 'heavy';
  // - slow when stress low AND tempo slow and queue small
  if (stress <= 3 && tempo >= 5 && queue <= 3) return 'slow';
  // - otherwise flow
  return 'flow';
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

/** Create a fresh timeline state. */
export function createTimelineState(partial?: Partial<TimelineState>): TimelineState {
  return {
    band: partial?.band ?? 'flow',
    overlay: partial?.overlay ?? null,
    pinned: partial?.pinned ?? false,
    next: partial?.next ?? null,
  };
}

/** Move band one step up or down in the canonical order. */
export function stepBand(state: TimelineState, dir: 'up' | 'down'): TimelineState {
  const idx = TIME_BAND_ORDER.indexOf(state.band);
  const nextIdx = clamp(idx + (dir === 'up' ? 1 : -1), 0, TIME_BAND_ORDER.length - 1);
  return { ...state, band: TIME_BAND_ORDER[nextIdx] };
}

/** Directly set the band. */
export function setBand(state: TimelineState, band: TimeBand): TimelineState {
  return { ...state, band };
}

/** Toggle the timeless overlay. */
export function toggleTimeless(state: TimelineState): TimelineState {
  return { ...state, overlay: state.overlay === 'timeless' ? null : 'timeless' };
}

/** Suggest a gentle next step, given the band. */
export function suggestOneTrueNext(band: TimeBand): OneTrueNext {
  return TIME_BAND_META[band].defaultNext;
}

/** Pin/unpin the current OTN. */
export function pin(state: TimelineState, next: OneTrueNext): TimelineState {
  return { ...state, next, pinned: true };
}
export function unpin(state: TimelineState): TimelineState {
  return { ...state, pinned: false };
}

/** Clear the current next (used after "done"). */
export function archiveNext(state: TimelineState): TimelineState {
  return { ...state, next: null, pinned: false };
}

/** Human label + whisper for UI layers. */
export function bandInfo(band: TimeBand) {
  const { label, whisper, cadenceSec } = TIME_BAND_META[band];
  return { label, whisper, cadenceSec };
}

/** A minimal, transport-agnostic event coming from the server. */
export type ServerEvent = {
  id: number | string;
  ts: string; // RFC3339
  source?: string; // e.g. "gratitude" | "emotion" | "energy" | "tell" | ...
  kind?: string; // optional, e.g. the emotion kind
  title?: string; // optional title from server
  details?: string | null;
  sealed?: boolean; // explicit sealed flag
  privacy?: 'public' | 'private' | 'sealed' | string; // tolerate unknowns
  who?: string; // optional author
  intensity?: number; // optional 0..1 or 0..100
  archetype?: string | null;
  [key: string]: unknown; // allow extra fields without narrowing
};

/** UI-friendly item the Timeline component can render without knowing server shape. */
export type TimelineItem = {
  id: number | string;
  ts: string; // RFC3339
  title: string; // human title (e.g. "gratitude")
  subtitle?: string; // short detail/excerpt, redacted when sealed
  icon?: string; // simple emoji/glyph (UI can wrap as needed)
  meta?: Record<string, unknown>; // raw extras for consumers
};

/** Convenience: is this event sealed or marked sealed via privacy? */
export function isSealed(ev: { sealed?: boolean; privacy?: string | null | undefined }): boolean {
  return ev.sealed === true || ev.privacy?.toLowerCase?.() === 'sealed';
}
/** Gentle glyph for a known server source. Falls back to a neutral dot. */
export function iconForSource(source?: string): string {
  const s = (source ?? '').toLowerCase();
  switch (s) {
    case 'gratitude':
      return '💖';
    case 'emotion':
      return '🫧';
    case 'energy':
      return '⚡️';
    case 'tell':
      return '📎';
    default:
      return '•';
  }
}

/**
 * Map a heterogeneous server event into a UI-friendly `TimelineItem`.
 * - Uses `iconForSource` for a gentle glyph.
 * - Derives a title from `kind`, then `title`, then `source`.
 * - Hides details when `sealed` or `privacy === 'sealed'`.
 */
export function mapServerEventToTimelineItem(ev: ServerEvent): TimelineItem {
  const sealed = isSealed(ev);

  // Default mapping
  const fallbackTitle = (ev.kind || ev.title || ev.source || 'note').toString();
  const rawDetails = typeof ev.details === 'string' ? ev.details.trim() : '';
  let subtitle = sealed ? '(sealed)' : rawDetails || undefined;
  let icon = iconForSource(ev.source);
  let title = fallbackTitle;

  // FamJam-aware tweaks (bridge events emitted from FamJamPanel)
  const kind = (ev.kind || '').toString();
  const isFam = kind.startsWith('famjam_');
  if (isFam) {
    // doorway id and friendly emoji mapping (kept local to avoid coupling)
    const doorway = (ev as any).doorway as string | undefined;
    const ROOM_EMOJI: Record<string, string> = {
      car: '🚗',
      kitchen: '🍳',
      firecircle: '🔥',
      anywhere: '✨',
    };

    icon = ROOM_EMOJI[doorway ?? ''] ?? '🎶';
    title = kind === 'famjam_note' ? 'fam jam' : 'fam jam (open)';

    // Prefer the famjam hint as the visible subtitle when not sealed
    const hint = (ev as any).hint as string | undefined;
    if (!sealed && hint && hint.trim()) {
      subtitle = hint.trim();
    }
  }

  const meta: Record<string, unknown> = {};
  if (ev.who) meta.who = ev.who;
  if (typeof ev.intensity === 'number') meta.intensity = ev.intensity;
  if (ev.archetype) meta.archetype = ev.archetype;
  if (ev.privacy) meta.privacy = ev.privacy;
  if (isFam && (ev as any).doorway) meta.doorway = (ev as any).doorway;
  if (sealed) meta.sealed = true;

  return { id: ev.id, ts: ev.ts, title, subtitle, icon, meta };
}

/** Utility: newest-first sort by `ts` (RFC3339-friendly). */
export function sortNewest<T extends { ts: string }>(arr: T[]): T[] {
  return [...arr].sort((a, b) => (a.ts < b.ts ? 1 : a.ts > b.ts ? -1 : 0));
}

/** Utility: dedupe by `id`, preferring the first occurrence (usually the freshest). */
export function dedupeById<T extends { id: string | number }>(arr: T[]): T[] {
  const seen = new Set<string | number>();
  const out: T[] = [];
  for (const it of arr) {
    if (seen.has(it.id)) continue;
    seen.add(it.id);
    out.push(it);
  }
  return out;
}

/** Dev-only helper (no Node types needed). */
function isDev() {
  // eslint-disable-next-line no-undef
  return typeof globalThis !== 'undefined' && (globalThis as any).__DEV__ === true;
}

// Sanity check in dev builds.
if (isDev()) {
  const known = new Set(TIME_BAND_ORDER);
  for (const key of Object.keys(TIME_BAND_META)) {
    if (!known.has(key as TimeBand)) {
      // eslint-disable-next-line no-console
      console.warn('[timeline] meta has unknown key:', key);
    }
  }
}
