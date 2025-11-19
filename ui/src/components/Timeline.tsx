import React from 'react';
import { Badge } from '@gratiaos/ui';

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
 *  - garden-core: ensure `@gratiaos/tokens` and (optional) `@gratiaos/ui/styles/base.css`
 *    are published/linked.
 *  - m3/ui: import tokens once at the root (e.g. `import '@gratiaos/tokens'`) so
 *    Timeline responds to global semantics immediately.
 */

/**
 * Minimal, presentational timeline for recent events (emotions, etc).
 * Tailwind v4-friendly classes. No data fetching here — just render.
 */
/**
 * whisper: the Pad scene stays in resonance with docs/vision/digital-intelligence.md — let the field hum.
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
      source: 'emotion',
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
  /** Optional cap for number of badges shown per item. Extra badges are collapsed under +N. */
  maxBadges?: number;
  /** Show a tiny Fam Jam filter chip inside the component. */
  showFamFilter?: boolean;
  /** Start with the Fam filter ON. Default: false */
  famFilterDefaultOn?: boolean;
};

/**
 * Renders a vertical timeline with dot connectors.
 * This is intentionally minimal (no virtualization, no fetch).
 */
export const Timeline: React.FC<TimelineProps> = ({
  items,
  compact = false,
  emptyState,
  maxBadges,
  showFamFilter = false,
  famFilterDefaultOn = false,
}) => {
  const density = compact ? 'py-2' : 'py-3';
  const spaceY = compact ? 'space-y-2' : 'space-y-3';

  const [famOnly, setFamOnly] = React.useState<boolean>(() => {
    try {
      const raw = localStorage.getItem('timeline:famOnly');
      return raw != null ? raw === '1' : famFilterDefaultOn;
    } catch {
      return famFilterDefaultOn;
    }
  });
  const isFam = React.useCallback((it: TimelineItem) => {
    const meta = (typeof it.meta === 'object' && it.meta ? (it.meta as Record<string, unknown>) : undefined) as
      | (Record<string, unknown> & { doorway?: unknown })
      | undefined;
    return typeof meta?.doorway === 'string';
  }, []);

  const list = showFamFilter && famOnly ? items.filter(isFam) : items;
  React.useEffect(() => {
    try {
      localStorage.setItem('timeline:famOnly', famOnly ? '1' : '0');
    } catch {}
  }, [famOnly]);
  const famCount = React.useMemo(() => {
    try {
      const totalFam = items.reduce((n, it) => n + (isFam(it) ? 1 : 0), 0);
      return famOnly ? list.length : totalFam;
    } catch {
      return 0;
    }
  }, [items, isFam, famOnly, list]);

  if (!list || list.length === 0) {
    const msg = showFamFilter && famOnly ? 'No Fam Jam items yet.' : 'Nothing here yet.';
    return <div className="text-sm text-subtle">{emptyState ?? msg}</div>;
  }

  return (
    <>
      {showFamFilter ? (
        <div className="mb-2 flex items-center justify-end">
          <button
            type="button"
            aria-pressed={famOnly}
            onClick={() => setFamOnly((v) => !v)}
            className={
              famOnly
                ? 'inline-flex items-center gap-1 rounded-full border border-border bg-fill-subtle px-2 py-0.5 text-2xs font-medium text-text'
                : 'inline-flex items-center gap-1 rounded-full border border-transparent px-2 py-0.5 text-2xs font-medium text-subtle hover:border-border hover:bg-fill-subtle'
            }>
            <span aria-hidden>✨</span>
            <span>{famOnly ? 'Fam only' : 'Filter: Fam Jam'}</span>
            <span className="text-[10px] text-subtle">({famCount})</span>
          </button>
        </div>
      ) : null}
      <ol className={`relative ${spaceY}`}>
        {/* vertical line */}
        <div className="absolute left-3 top-0 bottom-0 w-px bg-border" />

        {list.map((it) => (
          <li key={it.id} className={`pl-8 ${density}`}>
            {/* dot */}
            <span aria-hidden className="absolute left-2 mt-1.5 h-2 w-2 rounded-full bg-border ring-2 ring-elev" />
            <div className="flex items-start gap-2">
              {it.icon ? <span className="shrink-0 mt-0.5">{it.icon}</span> : null}
              <div className="min-w-0">
                <div className="flex items-center flex-wrap gap-2">
                  <span className="text-sm font-medium text-text">{it.title}</span>
                  <span className="text-xs text-subtle">{formatClock(it.ts)}</span>
                  {compact ? <TimelineBadges item={it} inline max={maxBadges} /> : null}
                </div>
                {!compact ? <TimelineBadges item={it} max={maxBadges} /> : null}
                {it.subtitle ? <p className="text-sm text-subtle break-words">{it.subtitle}</p> : null}
              </div>
            </div>
          </li>
        ))}
      </ol>
    </>
  );
};

/** Small skeleton for loading states. */
export const TimelineSkeleton: React.FC<{ rows?: number }> = ({ rows = 4 }) => {
  return (
    <ol className="relative space-y-3 animate-pulse">
      <div className="absolute left-3 top-0 bottom-0 w-px bg-border" />
      {Array.from({ length: rows }).map((_, i) => (
        <li key={i} className="pl-8 py-3">
          <span aria-hidden className="absolute left-1.5 mt-1 h-3 w-3 rounded-full bg-border ring-2 ring-elev" />
          <div className="space-y-2">
            <div className="h-3 w-24 rounded bg-border" />
            <div className="h-3 w-48 rounded bg-fill-subtle" />
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

function TimelineBadges({ item, inline = false, max }: { item: TimelineItem; inline?: boolean; max?: number }) {
  const badges = badgesForItem(item);
  let visible = badges;
  let overflow = 0;
  if (typeof max === 'number' && max > 0 && badges.length > max) {
    const keep = Math.max(1, max - 1); // keep room for the "+N" badge
    visible = badges.slice(0, keep);
    overflow = badges.length - visible.length;
  }
  const overflowList = badges
    .slice(visible.length)
    .map((b) => `${b.icon} ${b.label}`)
    .join(' · ');
  return (
    <div className={inline ? 'flex flex-wrap gap-2' : 'mt-1 flex flex-wrap gap-2'}>
      {visible.map((badge) => (
        <Badge key={badge.key} variant="subtle" size="sm" leading={<span aria-hidden>{badge.icon}</span>}>
          {badge.label}
        </Badge>
      ))}
      {overflow > 0 ? (
        <span className="relative group inline-flex" aria-label={`+${overflow} more`} role="button" tabIndex={0}>
          <Badge variant="subtle" size="sm">
            +{overflow}
          </Badge>
          {/* tooltip */}
          <span
            role="tooltip"
            className="pointer-events-none absolute z-10 bottom-full left-1/2 -translate-x-1/2 mb-1 max-w-xs whitespace-pre rounded-md border border-border bg-elev px-2 py-1 text-2xs text-text shadow-md opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus:opacity-100">
            {overflowList}
          </span>
        </span>
      ) : null}
    </div>
  );
}

function badgesForItem(item: TimelineItem) {
  const badges: { key: string; icon: string; label: string }[] = [];
  const meta = (typeof item.meta === 'object' && item.meta ? (item.meta as Record<string, unknown>) : undefined) as
    | (Record<string, unknown> & { source?: unknown; doorway?: unknown })
    | undefined;

  const source = typeof meta?.source === 'string' ? meta.source : undefined;
  const doorway = typeof meta?.doorway === 'string' ? meta.doorway : undefined;

  // Doorway badge (FamJam rooms)
  if (doorway) {
    const ROOM: Record<string, { emoji: string; label: string }> = {
      car: { emoji: '🚗', label: 'Car' },
      kitchen: { emoji: '🍳', label: 'Kitchen' },
      firecircle: { emoji: '🔥', label: 'Firecircle' },
      anywhere: { emoji: '✨', label: 'Anywhere' },
    };
    const r = ROOM[doorway] ?? { emoji: '🎶', label: doorway };
    badges.push({ key: `doorway:${doorway}`, icon: r.emoji, label: r.label });
  }

  // Existing source badges
  if (source === 'bridge') badges.push({ key: 'source:bridge', icon: '🧭', label: 'Bridge' });
  if (source === 'purpose') badges.push({ key: 'source:purpose', icon: '🎯', label: 'Purpose' });
  if (source === 'covenant') badges.push({ key: 'source:covenant', icon: '🤝', label: 'Covenant' });

  return badges;
}
