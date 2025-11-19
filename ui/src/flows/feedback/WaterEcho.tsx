import React, { useEffect } from 'react';
import { useSignal } from '../shared/useSignal';
import { waterEcho$, touchWaterEcho } from './waterEchoStore';
import { markWater } from './spiritChordStore';

export function WaterEcho() {
  const echo = useSignal(waterEcho$, waterEcho$.value ?? false);

  useEffect(() => {
    touchWaterEcho();
  }, []);

  useEffect(() => {
    if (!echo) return;
    markWater();
    const timer = window.setTimeout(() => waterEcho$.set(false), 3000);
    return () => window.clearTimeout(timer);
  }, [echo]);

  if (!echo) return null;
  return <div data-ui="water-echo" aria-hidden="true" />;
}
