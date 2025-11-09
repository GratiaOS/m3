const isNavigatorMac = () => {
  if (typeof navigator === 'undefined') return false;
  const platform = navigator.platform || navigator.userAgent;
  return /Mac|iPhone|iPad|iPod/.test(platform);
};

const mac = isNavigatorMac();

export const isMac = () => mac;

export const inEditable = (target: EventTarget | null) => {
  const el = target as HTMLElement | null;
  if (!el) return false;
  return Boolean(el.closest('input, textarea, [contenteditable=""], [contenteditable="true"]'));
};

export const matchToggleMemory = (event: KeyboardEvent) => {
  if (inEditable(event.target)) return false;
  if (mac) {
    return event.ctrlKey && event.altKey && !event.metaKey && !event.shiftKey && event.key.toLowerCase() === 'm';
  }
  return event.altKey && !event.ctrlKey && !event.metaKey && !event.shiftKey && event.key.toLowerCase() === 'm';
};

export const matchCycleDepth = (event: KeyboardEvent) => {
  if (inEditable(event.target)) return false;
  if (mac) {
    return event.ctrlKey && event.altKey && !event.metaKey && !event.shiftKey && event.key.toLowerCase() === 'd';
  }
  return event.altKey && !event.ctrlKey && !event.metaKey && !event.shiftKey && event.key.toLowerCase() === 'd';
};

export const matchJumpDecode = (event: KeyboardEvent) => {
  if (inEditable(event.target)) return false;
  if (mac) {
    return event.ctrlKey && event.altKey && event.shiftKey && !event.metaKey && event.key.toLowerCase() === 'd';
  }
  return event.altKey && event.shiftKey && !event.ctrlKey && !event.metaKey && event.key.toLowerCase() === 'd';
};
