import React from 'react';

/**
 * Roadmap — Timeline polish & theming bridge
 *
 * 1) Tokenize styles:
 *    - Replace hardcoded `text-zinc-*` / `bg-zinc-*` with semantic tokens/utilities
 *      from Garden Core (e.g. `text-muted`, `border-border`, `bg-[var(--color-elev)]`).
 *    - Goal: the component auto-themes with light/dark and future palettes.
 *
 * 2) Animate dot & line:
 *    - Add soft ambient motion: `animate-breathe` / `animate-twinkle` on the dot,
 *      subtle opacity shift on the vertical line based on depth.
 *    - Tie into Pad depth tokens when rendered inside the Pad.
 *
 * 3) Whisper entrance:
 *    - On mount / item add, ease in each `<li>` with opacity+translate-y for a
 *      gentle "bloom" effect (no harsh pop-ins).
 *
 * 4) Density variants helper:
 *    - Extract density logic (`compact` paddings/spacing) into a small helper so
 *      the render tree reads cleaner and is easy to extend.
 *
 * 5) Optional header slot:
 *    - Support an optional header/title/date label pinned at the top to enable
 *      multi-day groupings later without changing call sites.
 *
 * Bridge plan (repo-level):
 *  - garden-core: ensure `@garden/tokens` and (optional) `@garden/ui/styles/base.css`
 *    are published/linked.
 *  - m3/ui: import tokens once at the root (e.g. `import '@garden/tokens'`) so
 *    Timeline responds to global semantics immediately.
 */

/**
 * Minimal, presentational timeline for recent events (emotions, etc).
 * Tailwind v4-friendly classes. No data fetching here — just render.
 */

export type TimelineItem = {
  id: number | string;
  ts: string; // RFC3339
  title: string; // e.g. "gratitude"
  subtitle?: string; // detail/excerpt
  icon?: React.ReactNode; // optional glyph
  meta?: Record<string, unknown>; // arbitrary extra fields
};

/**
 * A minimal Emotion shape as returned by /emotions/recent and /emotions/resolve.
 * We keep it local to this file so consumers can use the helpers without importing
 * from a separate module yet.
 */
export type Emotion = {
  id: number;
  ts: string;
  who: string;
  kind: string; // "gratitude" | "fear" | ...
  intensity: number; // 0..1
  note_id?: number | null;
  details?: string | null;
  sealed?: boolean;
  archetype?: string | null;
  privacy?: string; // "public" | "private" | "sealed"
};

/**
 * Map an API Emotion row into a TimelineItem suitable for rendering.
 * - If privacy is "sealed" (or sealed=true), we hide details by default.
 */
export function mapEmotionToTimelineItem(e: Emotion): TimelineItem {
  const sealed = e.sealed === true || e.privacy === 'sealed';
  const subtitle = sealed ? '(sealed)' : (e.details ?? '').trim() || '(no details)';

  return {
    id: e.id,
    ts: e.ts,
    title: e.kind || 'emotion',
    subtitle,
    icon: e.kind === 'gratitude' ? '💖' : '🫧',
    meta: {
      who: e.who,
      intensity: e.intensity,
      archetype: e.archetype ?? undefined,
      privacy: e.privacy ?? 'public',
      sealed,
    },
  };
}

/** Sort newest first by timestamp (falls back to string compare). */
export function sortNewest<T extends { ts: string }>(arr: T[]): T[] {
  return [...arr].sort((a, b) => (a.ts < b.ts ? 1 : a.ts > b.ts ? -1 : 0));
}

/** Dedupe by id, preferring the first occurrence (usually the freshest). */
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

type TimelineProps = {
  items: TimelineItem[];
  /**
   * Optional flag to render compact density (smaller paddings/leading).
   * Default: false (comfortable).
   */
  compact?: boolean;
  /**
   * Optional empty-state slot. If not provided, a default friendly message is shown.
   */
  emptyState?: React.ReactNode;
};

/**
 * Renders a vertical timeline with dot connectors.
 * This is intentionally minimal (no virtualization, no fetch).
 */
export const Timeline: React.FC<TimelineProps> = ({ items, compact = false, emptyState }) => {
  const density = compact ? 'py-2' : 'py-3';
  const spaceY = compact ? 'space-y-2' : 'space-y-3';

  if (!items || items.length === 0) {
    return <div className="text-sm text-zinc-500">{emptyState ?? 'Nothing here yet.'}</div>;
  }

  return (
    <ol className={`relative ${spaceY}`}>
      {/* vertical line */}
      <div className="absolute left-3 top-0 bottom-0 w-px bg-zinc-200" />

      {items.map((it) => (
        <li key={it.id} className={`pl-8 ${density}`}>
          {/* dot */}
          <span aria-hidden className="absolute left-2 mt-1.5 h-2 w-2 rounded-full bg-zinc-300 ring-2 ring-white" />
          <div className="flex items-start gap-2">
            {it.icon ? <span className="shrink-0 mt-0.5">{it.icon}</span> : null}
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-zinc-900">{it.title}</span>
                <span className="text-xs text-zinc-400">{formatClock(it.ts)}</span>
              </div>
              {it.subtitle ? <p className="text-sm text-zinc-600 break-words">{it.subtitle}</p> : null}
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
};

/** Small skeleton for loading states. */
export const TimelineSkeleton: React.FC<{ rows?: number }> = ({ rows = 4 }) => {
  return (
    <ol className="relative space-y-3 animate-pulse">
      <div className="absolute left-3 top-0 bottom-0 w-px bg-zinc-200" />
      {Array.from({ length: rows }).map((_, i) => (
        <li key={i} className="pl-8 py-3">
          <span aria-hidden className="absolute left-1.5 mt-1 h-3 w-3 rounded-full bg-zinc-300 ring-2 ring-white" />
          <div className="space-y-2">
            <div className="h-3 w-24 rounded bg-zinc-200" />
            <div className="h-3 w-48 rounded bg-zinc-100" />
          </div>
        </li>
      ))}
    </ol>
  );
};

/** Format hour:minute from RFC3339 (fallback to raw string). */
function formatClock(ts: string): string {
  try {
    const d = new Date(ts);
    if (isNaN(d.getTime())) return ts;
    return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  } catch {
    return ts;
  }
}

export default Timeline;
