import { useEffect, useRef, useState } from 'react';
import { activePadId$, padRegistry$, type PadManifest } from '@gratiaos/pad-core';
import { phase$, pulse$, type Phase } from '@gratiaos/presence-kernel';
import { useSignal } from '../../shared/useSignal';

type Direction = 'left' | 'right' | 'none';

const MOMENTUM_EASE = 'cubic-bezier(.22,.61,.36,1)';
const TEMPO: Record<string, number> = {
  focused: 140,
  presence: 80,
  celebratory: 110,
  soft: 90,
  companion: 112,
  archive: 96,
};

function msForPhase(phase: string) {
  const bpm = TEMPO[phase] ?? 100;
  return Math.round((60000 / bpm) * 1.25);
}

export function useMomentum() {
  const pads = useSignal<PadManifest[]>(padRegistry$, padRegistry$.value ?? []);
  const activeId = useSignal<string | null>(activePadId$, activePadId$.value ?? null);
  const phase = useSignal<Phase>(phase$, (phase$.value as Phase) ?? 'presence');

  const [dir, setDir] = useState<Direction>('none');
  const [ms, setMs] = useState(() => msForPhase(phase));
  const prevIndex = useRef<number | null>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    setMs(msForPhase(phase));
  }, [phase]);

  useEffect(() => () => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
    }
  }, []);

  useEffect(() => {
    const order = pads.map((pad) => pad.id);
    if (!activeId) {
      prevIndex.current = null;
      setDir('none');
      return;
    }

    const index = order.indexOf(activeId);
    if (index === -1) {
      return;
    }

    if (prevIndex.current === null) {
      prevIndex.current = index;
      return;
    }

    let nextDir: Direction = 'none';
    if (index > prevIndex.current) nextDir = 'right';
    else if (index < prevIndex.current) nextDir = 'left';

    prevIndex.current = index;

    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    if (nextDir === 'none') {
      setDir('none');
      return;
    }

    setDir(nextDir);
    timerRef.current = window.setTimeout(() => {
      setDir('none');
      timerRef.current = null;
    }, ms);
  }, [activeId, pads, ms]);

  const armRef = useRef<() => void>(() => {});

  useEffect(() => {
    let arming = false;
    const sub = pulse$.subscribe(() => {
      arming = false;
    });
    armRef.current = () => {
      if (arming) return;
      arming = true;
      window.setTimeout(() => {
        arming = false;
      }, 60);
    };
    return () => {
      if (typeof sub === 'function') sub();
    };
  }, []);

  return {
    dir,
    ms,
    ease: MOMENTUM_EASE,
    armToBeat: () => armRef.current?.(),
  };
}
