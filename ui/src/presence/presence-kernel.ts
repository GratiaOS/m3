import { padEvents, type PadMood } from '@gratiaos/pad-core';
import {
  PresenceKernel as SharedPresenceKernel,
  phase$,
  mood$,
  setPhase as setSharedPhase,
  setMood as setSharedMood,
  type Phase,
  type Mood,
} from '@gratiaos/presence-kernel';
import { signalBus } from '@/adapters/webrtc-signal-bus';

const presenceKernel = new SharedPresenceKernel();

const SELF_ID = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `m3-${Math.random().toString(36).slice(2)}`;
let suppressSignalBroadcast = false;

presenceKernel.upsertPeer(SELF_ID);

mood$.subscribe((mood) => {
  if (suppressSignalBroadcast) return;
  presenceKernel.upsertPeer(SELF_ID);
  signalBus.emit('phase:update', { phase: mood, from: SELF_ID });
});

signalBus.on('phase:update', ({ phase, from }) => {
  if (!phase || from === SELF_ID) return;
  if (from) presenceKernel.upsertPeer(from as string);
  suppressSignalBroadcast = true;
  try {
    presenceKernel.setMood(phase as Mood);
  } finally {
    suppressSignalBroadcast = false;
  }
});

padEvents.on((msg) => {
  if (msg.type !== 'PAD.MOOD.SET') return;
  suppressSignalBroadcast = true;
  try {
    presenceKernel.setMood(msg.mood as Mood);
  } finally {
    suppressSignalBroadcast = false;
  }
});

presenceKernel.start();

export const setPresencePhase = (phase: Phase) => {
  presenceKernel.setPhase(phase);
};

export const setPresenceMood = (mood: PadMood) => {
  presenceKernel.setMood(mood as Mood);
  try {
    padEvents.send({ type: 'PAD.MOOD.SET', mood });
  } catch {
    // ignore broadcast failures; local state already updated
  }
};

export { presenceKernel, phase$, mood$, setSharedPhase as setPhase, setSharedMood as setMood };
export type { Phase as PresencePhase, Mood as PresenceMood };
