import { createSignal } from '@gratiaos/presence-kernel';

export type Breath = 'inhale' | 'exhale' | 'hold';
export type CoReg = 'apart' | 'near' | 'together';

export const myBreath$ = createSignal<Breath>('hold');
export const theirBreath$ = createSignal<Breath>('hold');
export const coReg$ = createSignal<CoReg>('apart');
export const opened$ = createSignal<boolean>(false);

const ALIGN_WINDOW = 900;
const NEAR_WINDOW = 450;
const CYCLES_TO_OPEN = 3;

let lastMine = 0;
let lastTheirs = 0;
let alignedStreak = 0;
let openTimer: ReturnType<typeof setTimeout> | null = null;
let paused = typeof document !== 'undefined' ? document.visibilityState !== 'visible' : false;

const now = () => performance.now();

export function markBreathMine(b: Breath) {
  myBreath$.set(b);
  lastMine = now();
  evaluate();
}

export function markBreathTheirs(b: Breath) {
  theirBreath$.set(b);
  lastTheirs = now();
  evaluate();
}

function evaluate() {
  if (paused) return;
  const mine = myBreath$.value;
  const theirs = theirBreath$.value;

  if (mine === 'hold' || theirs === 'hold') {
    coReg$.set('apart');
    alignedStreak = 0;
    return;
  }

  if (mine !== theirs) {
    coReg$.set('apart');
    alignedStreak = 0;
    return;
  }

  const dt = Math.abs(lastMine - lastTheirs);

  if (dt < NEAR_WINDOW) {
    coReg$.set('together');
    alignedStreak += 1;
  } else if (dt < ALIGN_WINDOW) {
    coReg$.set('near');
    alignedStreak = Math.max(0, alignedStreak - 1);
  } else {
    coReg$.set('apart');
    alignedStreak = 0;
  }

  if (alignedStreak >= CYCLES_TO_OPEN && !opened$.value) {
    opened$.set(true);
    dispatchOpen();
    if (openTimer) clearTimeout(openTimer);
    openTimer = setTimeout(() => opened$.set(false), 1600);
    alignedStreak = 0;
  }
}

function dispatchOpen() {
  try {
    window.dispatchEvent(new CustomEvent('game:breath:opened'));
  } catch {
    /* noop */
  }
}

export const pressStart = () => markBreathMine('inhale');
export const pressEnd = () => markBreathMine('exhale');

if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    paused = document.visibilityState !== 'visible';
    if (paused) {
      myBreath$.set('hold');
      coReg$.set('apart');
      alignedStreak = 0;
    }
  });
}
