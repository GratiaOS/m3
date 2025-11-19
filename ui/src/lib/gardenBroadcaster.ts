import { GardenBroadcaster } from '@gratiaos/pad-core';
import { gardenShareGate } from '@/flows/relational/gardenShareGate';
import { gardenRedact } from '@/flows/relational/gardenRedact';

export const broadcaster = new GardenBroadcaster({
  actor: 'local',
  scene: 'ui',
  gate: gardenShareGate,
  redact: gardenRedact,
});

if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    broadcaster.dispose();
  });
}
