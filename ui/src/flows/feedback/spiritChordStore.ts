import { createSignal } from '@gratiaos/presence-kernel';

export const spirit$ = createSignal(false);

const windowMs = 800;
let lastFire = 0;
let lastWater = 0;
let lastEarth = 0;
let lastAir = 0;

function checkHarmony() {
  const now = performance.now();
  const recent = [lastFire, lastWater, lastEarth, lastAir].every((t) => now - t < windowMs);
  if (!recent) return;
  spirit$.set(true);
  window.setTimeout(() => spirit$.set(false), 3200);
}

export const markFire = () => {
  lastFire = performance.now();
  checkHarmony();
};
export const markWater = () => {
  lastWater = performance.now();
  checkHarmony();
};
export const markEarth = () => {
  lastEarth = performance.now();
  checkHarmony();
};
export const markAir = () => {
  lastAir = performance.now();
  checkHarmony();
};
