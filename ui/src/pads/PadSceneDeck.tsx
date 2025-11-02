import React from 'react';
import { MemoryPad } from '@/pads/MemoryPad';
import { TownPresencePad } from '@/pads/TownPresencePad';
import { EnergyPad } from '@/pads/EnergyPad';
import { ValueBridgePad } from '@/pads/ValueBridgePad';

export function PadSceneDeck() {
  return (
    <section className="grid gap-6 md:grid-cols-2" aria-label="Pad scene prototypes">
      <MemoryPad />
      <TownPresencePad />
      <EnergyPad />
      <ValueBridgePad />
    </section>
  );
}
