// M3 — Joy helpers
// Aligns to Garden Toast conventions while preserving Joy phrasing/icons.
// Emits `garden:toast` detail via Garden Core's showToast helper.

import { showToast } from '@gratiaos/ui';

export type JoyLevel = 'info' | 'success' | 'warning' | 'error';

export interface JoyMessage {
  id?: string;
  title: string;
  body?: string;
  icon: string;
  level: JoyLevel;
  ttl?: number; // ms
}

const tone = {
  info: {
    icon: '🪁',
    wrap: (msg: string) => `A little breeze — ${msg}`,
  },
  success: {
    icon: '🌈',
    wrap: (msg: string) => `High five! ${msg}`,
  },
  warning: {
    icon: '🪶',
    wrap: (msg: string) => `Heads up — ${msg}`,
  },
  error: {
    icon: '🎭',
    wrap: (msg: string) => `Plot twist — ${msg}. We got it.`,
  },
} as const;

/** Map Joy level → Garden Toast variant */
function toVariant(level: JoyLevel): 'neutral' | 'positive' | 'warning' | 'danger' {
  switch (level) {
    case 'success':
      return 'positive';
    case 'warning':
      return 'warning';
    case 'error':
      return 'danger';
    case 'info':
    default:
      return 'neutral';
  }
}

export function joyWrap(message: string, level: JoyLevel = 'info'): JoyMessage {
  const t = tone[level] ?? tone.info;
  return {
    title: t.wrap(message),
    body: message,
    icon: t.icon,
    level,
    ttl: 3500,
  };
}

// Fire-and-forget toast — Garden aligned
export function notify(message: string, level: JoyLevel = 'info') {
  const j = joyWrap(message, level);

  const gardenDetail = {
    variant: toVariant(j.level),
    title: j.title,
    desc: j.body,
    icon: j.icon,
    durationMs: j.ttl,
  } as const;
  showToast(gardenDetail);
}

// Convenience: explicit API for structured Joy payloads
export function notifyJoy(j: Partial<JoyMessage> & { title?: string; body?: string; level?: JoyLevel }) {
  const level = j.level ?? 'info';
  const icon = j.icon ?? tone[level].icon;
  const title = j.title ?? tone[level].wrap(j.body ?? '');
  const ttl = j.ttl;

  const gardenDetail = {
    variant: toVariant(level),
    title,
    desc: j.body,
    icon,
    durationMs: ttl,
  } as const;

  showToast(gardenDetail);
}
