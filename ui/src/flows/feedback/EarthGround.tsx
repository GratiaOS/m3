import React from 'react';
import { useSignal } from '../shared/useSignal';
import { ground$ } from './earthGroundStore';

export function EarthGround() {
  const state = useSignal(ground$, ground$.value ?? 'idle');
  return <div data-ui="earth-ground" className={state} aria-hidden="true" />;
}
