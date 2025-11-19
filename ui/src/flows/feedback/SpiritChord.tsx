import React from 'react';
import { useSignal } from '../shared/useSignal';
import { spirit$ } from './spiritChordStore';

export function SpiritChord() {
  const active = useSignal(spirit$, spirit$.value ?? false);
  if (!active) return null;
  return <div data-ui="spirit-chord" aria-hidden="true" />;
}
