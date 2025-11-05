import { useEffect, useMemo } from 'react';
import {
  activePadId$,
  scene$,
  setActivePadId,
  announceSceneEnter,
  dispatchPadClose,
  type PadId,
} from '@gratiaos/pad-core';
import { useSignal } from '../../shared/useSignal';

type HashRoute = {
  pad: PadId | null;
  scene: string | null;
};

const HASH_PAD_KEY = 'pad';
const HASH_SCENE_KEY = 'scene';

function readHash(): HashRoute {
  if (typeof window === 'undefined') return { pad: null, scene: null };
  const raw = window.location.hash.replace(/^#/, '');
  const params = new URLSearchParams(raw);
  const pad = params.get(HASH_PAD_KEY);
  const scene = params.get(HASH_SCENE_KEY);
  return {
    pad: pad ?? null,
    scene: scene ?? null,
  };
}

function writeHash(next: Partial<HashRoute>) {
  if (typeof window === 'undefined') return;
  const raw = window.location.hash.replace(/^#/, '');
  const params = new URLSearchParams(raw);

  if ('pad' in next) {
    if (next.pad) {
      params.set(HASH_PAD_KEY, next.pad);
    } else {
      params.delete(HASH_PAD_KEY);
    }
  }

  if ('scene' in next) {
    if (next.scene) {
      params.set(HASH_SCENE_KEY, next.scene);
    } else {
      params.delete(HASH_SCENE_KEY);
    }
  }

  const nextString = params.toString();
  const nextHash = nextString ? `#${nextString}` : '';
  const target = `${window.location.pathname}${window.location.search}${nextHash}`;
  if (`${window.location.pathname}${window.location.search}${window.location.hash}` !== target) {
    window.history.replaceState(null, '', target);
  }
}

export type PadRoute = {
  id: PadId;
  scene: string | null;
};

export function usePadRoute(): PadRoute | null {
  const padId = useSignal<PadId | null>(activePadId$, activePadId$.value ?? null);
  const sceneId = useSignal<string | null>(scene$, scene$.value ?? null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const syncFromHash = () => {
      const { pad, scene } = readHash();
      if (pad !== null && pad !== activePadId$.value) {
        activePadId$.set(pad);
        setActivePadId(pad);
      }
      if (scene !== null && scene !== scene$.value) {
        announceSceneEnter(scene);
      }
      if (!pad && activePadId$.value) {
        activePadId$.set(null);
        setActivePadId(null);
      }
      if (!scene && scene$.value) {
        announceSceneEnter(null);
      }
    };
    syncFromHash();
    window.addEventListener('hashchange', syncFromHash);
    return () => window.removeEventListener('hashchange', syncFromHash);
  }, []);

  useEffect(() => {
    const unsubscribePad = activePadId$.subscribe((next) => {
      writeHash({ pad: next ?? null });
    });
    const unsubscribeScene = scene$.subscribe((next) => {
      writeHash({ scene: next ?? null });
    });
    return () => {
      unsubscribePad();
      unsubscribeScene();
    };
  }, []);

  return useMemo(() => {
    if (!padId) return null;
    return {
      id: padId,
      scene: sceneId ?? null,
    };
  }, [padId, sceneId]);
}

export function clearPadRoute(padId?: PadId | string) {
  const current = activePadId$.value;
  if (!current) return;
  if (padId && padId !== current) return;
  dispatchPadClose({ id: current, reason: 'route' });
  activePadId$.set(null);
  setActivePadId(null);
  announceSceneEnter(null);
  writeHash({ pad: null, scene: null });
}
