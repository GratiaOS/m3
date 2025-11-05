import { useEffect, useRef } from 'react';
import { showToast } from '@gratiaos/ui';

/**
 * RTPResetToast — UX bridge for capacity resets
 * --------------------------------------------
 * Listens for `rtp:reset` CustomEvents and emits a Garden-aligned toast event.
 *
 * Event detail shape (tolerant):
 *   { reason?: 'midnight' | 'manual' | 'recalc' | string }
 *
 * Notes
 *  • De‑duplicates bursts (e.g., multiple emitters) within 1.5s for same reason.
 *  • Emits `garden:toast` detail: { title, icon, variant, durationMs? }.
 */

type RTPResetDetail = { reason?: 'midnight' | 'manual' | 'recalc' | string };

type ToastVariant = 'neutral' | 'positive' | 'warning' | 'danger';

const REASON_META: Record<string, { variant: ToastVariant; icon: string; title: (r?: string) => string }> = {
  midnight: {
    variant: 'positive',
    icon: '🌅',
    title: () => 'Capacity reset for a new day',
  },
  manual: {
    variant: 'neutral',
    icon: '🧭',
    title: () => 'Capacity reset',
  },
  recalc: {
    variant: 'neutral',
    icon: '🔄',
    title: () => 'Capacity recalculated',
  },
  default: {
    variant: 'neutral',
    icon: '✨',
    title: () => 'Capacity reset',
  },
};

export default function RTPResetToast() {
  const last = useRef<{ t: number; reason?: string } | null>(null);

  useEffect(() => {
    function onReset(ev: Event) {
      const ce = ev as CustomEvent<RTPResetDetail>;
      const reason = ce?.detail?.reason ?? 'midnight';

      // de‑dupe fast repeats of the same reason
      const now = Date.now();
      if (last.current && last.current.reason === reason && now - last.current.t < 1500) return;
      last.current = { t: now, reason };

      const meta = REASON_META[reason] ?? REASON_META.default;

      showToast({
        title: meta.title(reason),
        icon: meta.icon,
        variant: meta.variant,
        // durationMs: 4200, // optional override; omit to use theme default
      });
    }

    window.addEventListener('rtp:reset', onReset as EventListener);
    return () => window.removeEventListener('rtp:reset', onReset as EventListener);
  }, []);

  return null;
}
