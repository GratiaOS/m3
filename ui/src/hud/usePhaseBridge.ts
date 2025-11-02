import { useEffect, useMemo, useState } from 'react';
import type { PadMood } from '@gratiaos/pad-core';
import { usePadRegistry } from '@/hooks/usePadRegistry';
import { usePadRoute } from '@/pads/usePadRoute';
import { mood$ } from '@/presence/presence-kernel';

const DEFAULT_PHASE: PadMood = 'soft';

export function usePhaseBridge() {
  const { pads } = usePadRegistry();
  const route = usePadRoute();
  const [phase, setPhase] = useState<PadMood>((mood$.value as PadMood | undefined) ?? DEFAULT_PHASE);

  useEffect(() => {
    return mood$.subscribe((next) => {
      setPhase((next as PadMood) ?? DEFAULT_PHASE);
    });
  }, []);

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
    phase,
  };
}
