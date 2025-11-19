import { createSignal } from '@gratiaos/presence-kernel';
import { myBreath$ } from './breathGame';
import { spiritHue$ } from './spiritChord';

export type BreathEvent = { t: number; breath: string; hue: number };

export const trace$ = createSignal<BreathEvent[]>([]);

let recording = false;
let start = 0;

export function startTrace() {
  trace$.set([]);
  start = performance.now();
  recording = true;
}

export function stopTrace() {
  recording = false;
}

export function clearTrace() {
  recording = false;
  trace$.set([]);
}

myBreath$.subscribe((breath) => {
  if (!recording) return;
  const now = performance.now();
  trace$.set([...trace$.value, { t: now - start, breath, hue: spiritHue$.value }]);
});
