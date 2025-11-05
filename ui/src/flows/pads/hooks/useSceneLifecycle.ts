import { useEffect } from 'react';
import { announceSceneEnter, announceSceneLeave } from '@gratiaos/pad-core';

export function useSceneLifecycle(sceneId: string | null | undefined) {
  useEffect(() => {
    if (!sceneId) return;
    announceSceneEnter(sceneId);
    return () => {
      announceSceneLeave(sceneId);
    };
  }, [sceneId]);
}
