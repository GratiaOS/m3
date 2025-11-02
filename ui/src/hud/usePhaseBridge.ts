import { useMemo } from 'react';
import { usePadMood, type PadMood } from '@gratiaos/pad-core';
import { usePadRegistry } from '@/hooks/usePadRegistry';
import { usePadRoute } from '@/pads/usePadRoute';

const DEFAULT_PHASE: PadMood = 'soft';

export function usePhaseBridge() {
  const { pads } = usePadRegistry();
  const route = usePadRoute();
  const [mood] = usePadMood(DEFAULT_PHASE);

  const active = useMemo(() => {
    if (route) {
      const match = pads.find((pad) => pad.id === route.id);
      if (match) return match;
    }
    if (pads.length > 0) {
      return pads[pads.length - 1];
    }
    return undefined;
  }, [pads, route]);

  return {
    activePadId: active?.id ?? null,
    activePadTitle: active?.title ?? '—',
    activeScene: active?.scene ?? '—',
    phase: mood,
  };
}
