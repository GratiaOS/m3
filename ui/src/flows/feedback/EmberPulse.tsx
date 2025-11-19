import React, { useEffect, useRef, useState } from 'react';
import { useSignal } from '../shared/useSignal';
import { ember$ } from './ember';

export function EmberPulse() {
  const emberBeat = useSignal(ember$, ember$.value ?? 0);
  const ref = useRef<HTMLDivElement | null>(null);
  const [prefersReduced, setPrefersReduced] = useState(() =>
    typeof window === 'undefined' ? false : window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handler = () => setPrefersReduced(mq.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  useEffect(() => {
    if (prefersReduced) return;
    if (!emberBeat) return;
    const node = ref.current;
    if (!node) return;
    node.classList.add('on');
    const timer = window.setTimeout(() => {
      node.classList.remove('on');
    }, 620);
    return () => window.clearTimeout(timer);
  }, [emberBeat, prefersReduced]);

  if (prefersReduced) return null;
  return <div ref={ref} data-ui="ember-pulse" aria-hidden="true" />;
}
