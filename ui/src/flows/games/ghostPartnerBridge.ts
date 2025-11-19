import type { GardenEnvelope } from '@gratiaos/pad-core';
import { broadcaster } from '@/lib/gardenBroadcaster';
import { markBreathTheirs, type Breath } from './breathGame';

const asBreath = (value: unknown): Breath | null => {
  if (value === 'inhale' || value === 'exhale' || value === 'hold') return value;
  return null;
};

export function attachGhostPartnerBridge() {
  if (!broadcaster.hasChannel) return () => {};

  const offBreath = broadcaster.on('breath', (packet: GardenEnvelope<'breath'>, origin) => {
    if (origin === 'local') return;
    const payload = packet.payload ?? {};
    const next = asBreath((payload as { phase?: unknown }).phase ?? (payload as { stage?: unknown }).stage);
    if (next) {
      markBreathTheirs(next);
    }
  });

  const offPulse = broadcaster.on('pulse', (_packet, origin) => {
    if (origin === 'local') return;
    // Placeholder — future ribbon/presence nudges hook here.
  });

  return () => {
    offBreath();
    offPulse();
  };
}
