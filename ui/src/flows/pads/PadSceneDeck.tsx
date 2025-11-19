import React, { useEffect, useState, useRef } from 'react';
import { flow$, padRegistry$, type FlowSnapshot, type PadManifest } from '@gratiaos/pad-core';
import type { SceneId } from '@gratiaos/pad-core';
import { phase$ } from '@gratiaos/presence-kernel';
import { useSignal } from '../shared/useSignal';
import { useMomentum } from './hooks/useMomentum';
import { useSceneBloom } from './hooks/useSceneBloom';
import { useFocusHandoff } from './hooks/useFocusHandoff';
import { PresenceTrace } from './PresenceTrace';
import { setPadTrace, clearPadTrace, releasePadTrace } from './presenceTraceStore';
import { pressGround } from '../feedback/earthGroundStore';
import '../../styles/pads.css';

const EXIT_TIMEOUT_MS = 320;
const TEMPO_MAP: Record<string, number> = {
  presence: 80,
  archive: 96,
  companion: 112,
  focused: 140,
  celebratory: 150,
  soft: 108,
};

type PadComponent = React.ComponentType<Record<string, unknown>>;

function resolveComponent(manifest: PadManifest | null): PadComponent | null {
  if (!manifest) return null;
  const meta = manifest.meta as { component?: PadComponent; preview?: PadComponent } | undefined;
  return meta?.preview ?? meta?.component ?? null;
}

export function PadSceneDeck() {
  const [snapshot, setSnapshot] = useState<FlowSnapshot>(() => flow$.value);
  const [stack, setStack] = useState<Array<{ key: string; phase: string; node: React.ReactNode }>>([]);
  const phase = useSignal(phase$, (phase$.value as string) ?? 'presence');
  const { dir, ms, ease } = useMomentum();
  // Bloom animation ref callback
  const bloomRef = useSceneBloom<HTMLDivElement>();
  // Current scene root ref (used for focus handoff queries)
  const currentRef = useRef<HTMLElement | null>(null);
  const deckRef = useRef<HTMLElement | null>(null);
  const padIdRef = useRef<string | null>(snapshot.pad?.id ?? null);

  // Chain bloom ref + store current scene element for focus logic
  const setCurrentRef = (el: HTMLElement | null) => {
    currentRef.current = el;
    bloomRef(el as HTMLDivElement | null);
  };

  // Polite focus handoff when pad changes
  useFocusHandoff(currentRef);
  const pads = useSignal(padRegistry$, padRegistry$.value ?? []);

  useEffect(() => {
    const unsubscribe = flow$.subscribe((snap) => {
      const prevPad = padIdRef.current;
      const nextPadId = snap.pad?.id ?? null;
      if (prevPad && prevPad !== nextPadId) {
        releasePadTrace(prevPad);
      }
      padIdRef.current = nextPadId;
      setSnapshot(snap);
      if (!snap.pad) {
        setStack([]);
        return;
      }

      const sceneId: SceneId | null = snap.scene ?? snap.pad.defaultSceneId ?? null;
      const key = `${snap.pad.id}:${sceneId ?? 'default'}`;
      const PadComponent = resolveComponent(snap.pad);
      if (!PadComponent) {
        setStack([]);
        return;
      }

      const nextNode = <PadComponent sceneId={sceneId} phase={snap.phase} me="preview" />;

      setStack((current) => {
        if (current[0]?.key === key) return current;
        const nextEntry = { key, phase: snap.phase, node: nextNode };
        if (current.length === 0) return [nextEntry];

        const exiting = {
          ...current[0],
          node: current[0].node,
        };

        return [nextEntry, exiting];
      });

      window.setTimeout(() => {
        setStack((state) => state.slice(0, 1));
        pressGround();
      }, EXIT_TIMEOUT_MS);
    });

    return () => unsubscribe();
  }, []);

  if (stack.length === 0) {
    return (
      <section className="pad-deck" aria-label="Pad scene" data-phase={phase}>
        <p className="pad-shelf__empty">{pads.length === 0 ? 'Pads warming up…' : "Whenever you're ready."}</p>
      </section>
    );
  }

  const beat = snapshot.t;
  const tempo = TEMPO_MAP[phase] ?? 110;
  const sceneDurationMs = Math.round((60000 / tempo) * 2);
  const sceneStyle: Record<string, string | number> = {
    '--beat': beat,
    '--scene-ms': `${sceneDurationMs}ms`,
    '--momentum-ms': `${ms}ms`,
    '--momentum-ease': ease,
  };

  const momentumClass = dir !== 'none' ? ` is-momenting dir-${dir}` : '';

  useEffect(() => {
    const root = deckRef.current;
    if (!root) return;

    const handleFocusIn = (event: FocusEvent) => {
      const padId = padIdRef.current;
      if (!padId) return;
      const target = event.target as HTMLElement | null;
      if (!target) return;
      const traceTarget = target.closest<HTMLElement>('input, textarea, [contenteditable="true"], [data-traceable]');
      if (!traceTarget) return;
      const scene = root.querySelector<HTMLElement>('.pad-scene.current .pad-scene-inner');
      if (!scene) return;
      const sceneRect = scene.getBoundingClientRect();
      const targetRect = traceTarget.getBoundingClientRect();
      const scrollTop = scene.scrollTop ?? 0;
      const y = targetRect.top - sceneRect.top + scrollTop;
      setPadTrace({ padId, y: Math.max(0, y), ts: Date.now() });
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      const padId = padIdRef.current;
      if (!padId) return;
      if (!(event.target instanceof HTMLElement)) return;
      if (!root.contains(event.target)) return;
      clearPadTrace();
    };

    root.addEventListener('focusin', handleFocusIn);
    root.addEventListener('keydown', handleKeyDown);
    return () => {
      root.removeEventListener('focusin', handleFocusIn);
      root.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return (
    <section
      ref={deckRef}
      className={`pad-deck phase-${phase}${momentumClass}`}
      style={sceneStyle}
      data-phase={phase}
      aria-live="polite">
      <div className="pad-track">
        {stack.map((entry, index) => {
          const isCurrent = index === 0;
          if (isCurrent) {
            return (
              <div key={entry.key} className={`pad-scene current phase-${entry.phase}`}>
                <div ref={setCurrentRef} className="pad-scene-inner">
                  <PresenceTrace padId={snapshot.pad?.id ?? null} />
                  {entry.node}
                </div>
              </div>
            );
          }

          return (
            <div key={entry.key} className={`pad-scene exiting phase-${entry.phase}`}>
              <div className="pad-scene-inner">{entry.node}</div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
