import React, { useEffect, useRef } from 'react';
import { useSignal } from '../shared/useSignal';
import { lastTrace$, clearPadTrace } from './presenceTraceStore';

export function PresenceTrace({ padId }: { padId: string | null }) {
  const trace = useSignal(lastTrace$, lastTrace$.value ?? null);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (!trace || !trace.release) return;
    node.classList.add('release');
    const timer = window.setTimeout(() => {
      clearPadTrace();
    }, 240);
    return () => window.clearTimeout(timer);
  }, [trace]);

  if (!trace || !padId || trace.padId !== padId) return null;
  return <div ref={ref} data-ui="presence-trace" style={{ top: `${Math.max(0, trace.y)}px` }} />;
}
