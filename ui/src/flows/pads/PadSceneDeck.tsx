import React, { useEffect, useState } from 'react';
import { flow$, type FlowSnapshot, type PadManifest } from '@gratiaos/pad-core';
import type { SceneId } from '@gratiaos/pad-core';
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

      const nextNode = (
        <div className={`pad-scene phase-${snap.phase}`}>
          <PadComponent sceneId={sceneId} phase={snap.phase} me="preview" />
        </div>
      );

      setStack((current) => {
        if (current[0]?.key === key) return current;
        const nextEntry = { key, phase: snap.phase, node: nextNode };
        if (current.length === 0) return [nextEntry];

        const exiting = {
          ...current[0],
          node: (
            <div className={`pad-scene exiting phase-${current[0].phase}`}>{current[0].node}</div>
          ),
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
      <section className="pad-deck" aria-label="Pad scene">
        <p className="pad-shelf__empty">No pads registered yet.</p>
      </section>
    );
  }

  const phase = snapshot.phase;
  const beat = snapshot.t;
  const tempo = TEMPO_MAP[phase] ?? 110;
  const sceneDurationMs = Math.round((60000 / tempo) * 2);
  const sceneStyle = {
    ['--beat' as any]: beat,
    ['--scene-ms' as any]: `${sceneDurationMs}ms`,
  };

  return (
    <section className={`pad-deck phase-${phase}`} style={sceneStyle} aria-live="polite">
      {stack.map((entry) => (
        <React.Fragment key={entry.key}>{entry.node}</React.Fragment>
      ))}
    </section>
  );
}
