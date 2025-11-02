import { padEvents, type PadMood } from '@gratiaos/pad-core';
import { signalBus } from '@/adapters/webrtc-signal-bus';

export type PresencePhase = 'companion' | 'presence' | 'archive';

export type PresenceSnapshot = Readonly<{
  t: number;
  phase: PresencePhase;
  mood: PadMood;
  peers: number;
  whisper?: string;
}>;

export type KernelEvent =
  | { type: 'tick'; snap: PresenceSnapshot }
  | { type: 'phase:set'; phase: PresencePhase; snap: PresenceSnapshot }
  | { type: 'mood:set'; mood: PadMood; snap: PresenceSnapshot }
  | { type: 'whisper'; message: string; snap: PresenceSnapshot };

type Listener = (event: KernelEvent) => void;

type Signal<T> = {
  subscribe(fn: (v: T) => void): () => void;
  get(): T;
  set(next: T): void;
};

function createSignal<T>(initial: T): Signal<T> {
  let value = initial;
  const listeners = new Set<(v: T) => void>();
  return {
    subscribe(fn) {
      listeners.add(fn);
      fn(value);
      return () => listeners.delete(fn);
    },
    get() {
      return value;
    },
    set(next) {
      if (Object.is(value, next)) return;
      value = next;
      listeners.forEach((fn) => {
        try {
          fn(value);
        } catch {
          // ignore listener errors
        }
      });
    },
  };
}

const phaseSignal = createSignal<PadMood>('soft');
const SELF_ID = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `m3-${Math.random().toString(36).slice(2)}`;
let suppressBroadcast = false;

export const phase$ = {
  subscribe: (fn: (phase: PadMood) => void) => phaseSignal.subscribe(fn),
  get current(): PadMood {
    return phaseSignal.get();
  },
};

phase$.subscribe((phase) => {
  if (suppressBroadcast) return;
  signalBus.emit('phase:update', { phase, from: SELF_ID });
});

signalBus.on('phase:update', ({ phase, from }) => {
  if (!phase || from === SELF_ID) return;
  suppressBroadcast = true;
  try {
    phaseSignal.set(phase as PadMood);
  } finally {
    suppressBroadcast = false;
  }
});

class PresenceKernel {
  private phase: PresencePhase = 'presence';
  private mood: PadMood = 'soft';
  private listeners = new Set<Listener>();
  private whisperMsg = '';
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(private readonly intervalMs: number = 1000, private readonly now: () => number = () => Date.now()) {}

  start() {
    if (this.timer) return;
    this.timer = setInterval(() => this.tick(), this.intervalMs);
    this.tick();
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  setPhase(next: PresencePhase) {
    if (this.phase === next) return;
    this.phase = next;
    this.publish({ type: 'phase:set', phase: next, snap: this.snapshot });
  }

  setMood(next: PadMood, opts: { broadcast?: boolean } = { broadcast: true }) {
    if (this.mood === next) return;
    this.mood = next;
    phaseSignal.set(next);
    if (opts.broadcast) {
      try {
        padEvents.send({ type: 'PAD.MOOD.SET', mood: next });
      } catch {
        // ignore broadcast errors; local state already updated
      }
    }
    this.publish({ type: 'mood:set', mood: next, snap: this.snapshot });
  }

  whisper(message: string) {
    this.whisperMsg = message;
    this.publish({ type: 'whisper', message, snap: this.snapshot });
  }

  on(listener: Listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  get snapshot(): PresenceSnapshot {
    return {
      t: this.now(),
      phase: this.phase,
      mood: this.mood,
      peers: 1,
      whisper: this.whisperMsg || undefined,
    };
  }

  private tick() {
    this.publish({ type: 'tick', snap: this.snapshot });
  }

  private publish(event: KernelEvent) {
    this.listeners.forEach((fn) => {
      try {
        fn(event);
      } catch {
        // ignore listener errors
      }
    });
  }
}

export const presenceKernel = new PresenceKernel();

presenceKernel.on((event) => {
  if (event.type === 'mood:set') {
    phaseSignal.set(event.mood);
  }
});

padEvents.on((msg) => {
  if (msg.type === 'PAD.MOOD.SET') {
    presenceKernel.setMood(msg.mood, { broadcast: false });
  }
});

presenceKernel.start();

export const setPresenceMood = (mood: PadMood) => presenceKernel.setMood(mood);
