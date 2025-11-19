import { useCallback, useEffect, useRef, useState } from 'react';

const TRANSITION_MS = 240;

export function useSceneTransition(initial: string, desiredScene?: string | null) {
  const [scene, setScene] = useState(desiredScene ?? initial);
  const [transitioning, setTransitioning] = useState(false);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!desiredScene) return;
    setScene((current) => (current === desiredScene ? current : desiredScene));
  }, [desiredScene]);

  useEffect(
    () => () => {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
      }
    },
    []
  );

  const change = useCallback(
    (next: string) => {
      if (next === scene) return;
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
      }
      setTransitioning(true);
      timerRef.current = window.setTimeout(() => {
        setScene(next);
        setTransitioning(false);
        timerRef.current = null;
      }, TRANSITION_MS);
    },
    [scene]
  );

  return { scene, change, transitioning };
}
