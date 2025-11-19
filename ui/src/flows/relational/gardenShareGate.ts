import type { GardenShareGate } from '@gratiaos/pad-core';
import { consent$, depth$ } from './relationalAlignment';

export const gardenShareGate: GardenShareGate = (type) => {
  const consent = consent$.value;
  if (!consent) return false;

  const depth = depth$.value;
  if (depth === 'soft') {
    return type === 'pulse' || type === 'breath' || type === 'consent';
  }

  return type !== 'moment';
};
