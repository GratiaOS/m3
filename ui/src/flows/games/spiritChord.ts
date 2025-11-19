import { createSignal } from '@gratiaos/presence-kernel';
import { coReg$, type CoReg } from './breathGame';

export const spiritHue$ = createSignal<number>(210);
export const spiritTone$ = createSignal<'none' | 'breathe' | 'hum'>('none');

const updateFromState = (state: CoReg) => {
  switch (state) {
    case 'together':
      spiritHue$.set(160);
      spiritTone$.set('hum');
      break;
    case 'near':
      spiritHue$.set(200);
      spiritTone$.set('breathe');
      break;
    default:
      spiritHue$.set(210);
      spiritTone$.set('none');
  }
};

updateFromState(coReg$.value);

coReg$.subscribe((state) => {
  updateFromState(state);
});

export function nudgeSpiritHue(delta = 6, ms = 1200) {
  const base = spiritHue$.value;
  spiritHue$.set(base + delta);
  window.setTimeout(() => {
    if (spiritHue$.value === base + delta) {
      spiritHue$.set(base);
    }
  }, ms);
}
