import { createSignal } from '@gratiaos/presence-kernel';
import { markEarth } from './spiritChordStore';

export type GroundState = 'idle' | 'settle';

export const ground$ = createSignal<GroundState>('idle');

export function pressGround(delay = 0) {
  if (delay > 0) {
    window.setTimeout(() => pressGround(0), delay);
    return;
  }
  ground$.set('settle');
  markEarth();
  window.setTimeout(() => ground$.set('idle'), 420);
}
