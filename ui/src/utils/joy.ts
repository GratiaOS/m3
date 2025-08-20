export type JoyLevel = 'info' | 'success' | 'warning' | 'error';

export interface JoyMessage {
  id?: string;
  title: string;
  body?: string;
  icon: string;
  level: JoyLevel;
  ttl?: number; // ms
}

export function joyWrap(message: string, level: JoyLevel = 'info'): JoyMessage {
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

  const style = tone[level] || tone.info;
  return {
    title: style.wrap(message),
    body: message,
    icon: style.icon,
    level,
    ttl: 3500,
  };
}

// fire-and-forget toast event
export function notify(message: string, level: JoyLevel = 'info') {
  const detail = joyWrap(message, level);
  window.dispatchEvent(new CustomEvent<JoyMessage>('joy:toast', { detail }));
}
