import { pulse$ } from '@gratiaos/presence-kernel';
import { markBreathTheirs, type Breath } from './breathGame';

type Phase = Extract<Breath, 'inhale' | 'exhale'>;

let enabled = false;
let phase: Phase = 'inhale';
let lastTime = 0;
let drift = 0;

const hasPerformance = typeof performance !== 'undefined';
const now = () => (hasPerformance ? performance.now() : Date.now());

const nextDrift = () => (Math.random() - 0.5) * 300; // ±150ms

pulse$.subscribe(() => {
  if (!enabled) return;
  const timestamp = now();
  if (timestamp - lastTime < 800 + drift) return;
  lastTime = timestamp;
  drift = nextDrift();

  phase = phase === 'inhale' ? 'exhale' : 'inhale';
  markBreathTheirs(phase);
});

export function startGhostPartner() {
  if (enabled) return;
  enabled = true;
  lastTime = now();
  drift = nextDrift();
}

export function stopGhostPartner() {
  if (!enabled) return;
  enabled = false;
  markBreathTheirs('hold');
}
