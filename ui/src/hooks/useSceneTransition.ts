import { useCallback, useState } from 'react';

export function useSceneTransition(initial: string) {
  const [scene, setScene] = useState(initial);
  const [transitioning, setTransitioning] = useState(false);

  const change = useCallback(
    (next: string) => {
      if (next === scene) return;
      setTransitioning(true);
      setTimeout(() => {
        setScene(next);
        setTransitioning(false);
      }, 240);
    },
    [scene]
  );

  return { scene, change, transitioning };
}
