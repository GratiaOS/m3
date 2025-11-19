import { createSignal } from '@gratiaos/presence-kernel';

export const waterEcho$ = createSignal(false);

let timer: ReturnType<typeof setTimeout> | null = null;
let paused = typeof document !== 'undefined' ? document.visibilityState !== 'visible' : false;

const clearTimer = () => {
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
};

const scheduleEcho = () => {
  clearTimer();
  timer = window.setTimeout(() => {
    if (!paused) waterEcho$.set(true);
  }, 2000);
};

if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    paused = document.visibilityState !== 'visible';
    if (paused) {
      clearTimer();
      waterEcho$.set(false);
    }
  });
}

export function touchWaterEcho() {
  if (paused) return;
  waterEcho$.set(false);
  scheduleEcho();
}
