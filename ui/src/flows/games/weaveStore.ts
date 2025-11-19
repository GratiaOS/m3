import { createSignal } from '@gratiaos/presence-kernel';
import { trace$ } from './traceRecorder';
import { coReg$ } from './breathGame';
import { spiritHue$ } from './spiritChord';
import { broadcaster } from '@/lib/gardenBroadcaster';

const BUFFER = 255;

export type WeaveBead = {
  id: string;
  t: number;
  hue: number;
  from: 'trace' | 'live' | 'sketch';
  tone: 'silence' | 'breathe' | 'hum' | 'echo';
  together?: boolean;
  created: number;
  x?: number; // normalized 0..1 (sketch)
  y?: number; // normalized 0..1 (sketch)
};

export const weave$ = createSignal<WeaveBead[]>([]);

let samplingTimer: ReturnType<typeof setInterval> | null = null;
let weaveStart = 0;

const randomId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2);
};

const pushBead = (bead: WeaveBead) => {
  weave$.set([...weave$.value.slice(-BUFFER), bead]);
  if (bead.from === 'live' && (typeof document === 'undefined' || document.visibilityState === 'visible')) {
    broadcaster.mirrorWeave({ hue: bead.hue, tone: bead.tone });
  }
};

export function addExternalBeadsFromSketch(
  points: Array<{ x: number; y: number }>,
  hue: number,
  opts?: { paceMs?: number },
) {
  if (!points.length) return;
  const pace = opts?.paceMs ?? 30;
  const now = performance.now();
  const stamped: WeaveBead[] = points.map((point, index) => ({
    id: `sketch-${randomId()}`,
    t: index * pace,
    hue,
    from: 'sketch',
    tone: 'echo',
    created: now + index * pace,
    x: point.x,
    y: point.y,
  }));
  weave$.set([...weave$.value.slice(-BUFFER), ...stamped].slice(-BUFFER));
}

const isVisible = () => (typeof document === 'undefined' ? true : document.visibilityState === 'visible');

export function beginWeave() {
  stopWeave();
  weaveStart = performance.now();

  // seed with most recent trace so the weave remembers.
  const trace = trace$.value;
  if (trace.length) {
    const now = performance.now();
    trace.forEach((event) => {
      pushBead({
        id: `trace-${randomId()}`,
        t: event.t,
        hue: event.hue,
        from: 'trace',
        tone: 'echo',
        created: now,
      });
    });
  }

  samplingTimer = window.setInterval(() => {
    if (!isVisible()) return;
    const now = performance.now();
    const elapsed = now - weaveStart;
    const hue = spiritHue$.value ?? 200;
    const state = coReg$.value;
    const tone = state === 'together' ? 'hum' : state === 'near' ? 'breathe' : 'silence';

    pushBead({
      id: `live-${randomId()}`,
      t: elapsed,
      hue,
      from: 'live',
      tone,
      together: state === 'together',
      created: now,
    });
  }, 400);
}

export function stopWeave() {
  if (samplingTimer) {
    clearInterval(samplingTimer);
    samplingTimer = null;
  }
}
