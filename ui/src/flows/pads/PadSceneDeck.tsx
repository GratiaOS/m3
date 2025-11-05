import React, { useEffect, useState } from 'react';
import { flow$, type FlowSnapshot, type PadManifest } from '@gratiaos/pad-core';
import type { SceneId } from '@gratiaos/pad-core';
import { phase$ } from '@gratiaos/presence-kernel';
import { useSignal } from '../shared/useSignal';
import { useMomentum } from './hooks/useMomentum';
import { useSceneBloom } from './hooks/useSceneBloom';
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

type PadComponent = React.ComponentType<any>;

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
  const bloomRef = useSceneBloom<HTMLDivElement>();

  useEffect(() => {
    const unsubscribe = flow$.subscribe((snap) => {
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
      }, EXIT_TIMEOUT_MS);
    });

    return () => unsubscribe();
  }, []);

  if (stack.length === 0) {
    return (
      <section className="pad-deck" aria-label="Pad scene" data-phase={phase}>
        <p className="pad-shelf__empty">No pads registered yet.</p>
      </section>
    );
  }

  const beat = snapshot.t;
  const tempo = TEMPO_MAP[phase] ?? 110;
  const sceneDurationMs = Math.round((60000 / tempo) * 2);
  const sceneStyle = {
    ['--beat' as any]: beat,
    ['--scene-ms' as any]: `${sceneDurationMs}ms`,
    ['--momentum-ms' as any]: `${ms}ms`,
    ['--momentum-ease' as any]: ease,
  };

  const momentumClass = dir !== 'none' ? ` is-momenting dir-${dir}` : '';

  return (
    <section
      className={`pad-deck phase-${phase}${momentumClass}`}
      style={sceneStyle}
      data-phase={phase}
      aria-live="polite"
    >
      <div className="pad-track">
        {stack.map((entry, index) => {
          const isCurrent = index === 0;
          if (isCurrent) {
            return (
              <div key={entry.key} className={`pad-scene current phase-${entry.phase}`}>
                <div ref={bloomRef} className="pad-scene-inner">
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
