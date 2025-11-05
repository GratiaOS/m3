import { useEffect, useMemo, useState } from 'react';
import type { PadMood, PadManifest } from '@gratiaos/pad-core';
import { padRegistry$, activePadId$, activeManifest$, flow$, type FlowSnapshot } from '@gratiaos/pad-core';
import { usePadRoute } from '@/flows/pads/hooks/usePadRoute';
import { mood$ } from '@/presence/presence-kernel';

const DEFAULT_PHASE: PadMood = 'soft';

export function usePhaseBridge() {
  const route = usePadRoute();
  const [phase, setPhase] = useState<PadMood>((mood$.value as PadMood | undefined) ?? DEFAULT_PHASE);
  const [pads, setPads] = useState<PadManifest[]>(() => padRegistry$.value);
  const [activePadId, setActivePadId] = useState<string | null>(() => activePadId$.value);
  const [activeManifest, setActiveManifest] = useState<PadManifest | null>(() => activeManifest$.value);
  const [flow, setFlow] = useState<FlowSnapshot>(() => flow$.value);

  useEffect(() => {
    return mood$.subscribe((next) => {
      setPhase((next as PadMood) ?? DEFAULT_PHASE);
    });
  }, []);

  useEffect(() => {
    const unsubPads = padRegistry$.subscribe(setPads);
    const unsubActive = activePadId$.subscribe(setActivePadId);
    const unsubManifest = activeManifest$.subscribe(setActiveManifest);
    const unsubFlow = flow$.subscribe(setFlow);
    return () => {
      unsubPads();
      unsubActive();
      unsubManifest();
      unsubFlow();
    };
  }, []);

  const active = useMemo(() => {
    const id = route?.id ?? activePadId ?? activeManifest?.id ?? null;
    if (!id) return undefined;
    return pads.find((pad) => pad.id === id) ?? activeManifest ?? undefined;
  }, [pads, route, activePadId, activeManifest]);

  return {
    activePadId: active?.id ?? null,
    activePadTitle: active?.title ?? '—',
    activeScene: flow.scene ?? '—',
    phase,
  };
}
