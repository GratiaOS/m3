import { createSignal } from '@gratiaos/presence-kernel';
import { markFire } from './spiritChordStore';

export const ember$ = createSignal<number>(0);

export function triggerEmber() {
  ember$.set(performance.now());
  markFire();
}
