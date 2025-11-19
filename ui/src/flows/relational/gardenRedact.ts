import type { GardenPacketType, GardenRedactFn, GardenPayloadMap } from '@gratiaos/pad-core';

export const gardenRedact: GardenRedactFn = (type: GardenPacketType, payload) => {
  const base = (payload ?? {}) as Record<string, unknown>;
  switch (type) {
    case 'breath': {
      const stage = normalizeBreath(base.phase ?? base.stage);
      const hue = typeof base.hue === 'number' ? base.hue : undefined;
      return { stage, hue } as GardenPayloadMap['breath'];
    }
    case 'weave': {
      const hue = typeof base.hue === 'number' ? base.hue : undefined;
      const tone = typeof base.tone === 'string' ? base.tone : undefined;
      return { hue, tone } as GardenPayloadMap['weave'];
    }
    case 'moment':
      return null;
    case 'pulse':
    case 'consent':
    default:
      return payload ?? null;
  }
};

const normalizeBreath = (value: unknown) => {
  if (value === 'inhale' || value === 'exhale' || value === 'hold') return value;
  return 'hold';
};
