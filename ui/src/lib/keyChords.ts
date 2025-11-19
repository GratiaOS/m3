type PlatformChord = {
  mac: string[];
  win: string[];
  linux: string[];
};

const chordMap = {
  memoryToggle: { mac: ['⌥M', '⌃⌥M'], win: ['Alt+M'], linux: ['Alt+M'] },
  cycleDepth: { mac: ['⌥D', '⌃⌥D'], win: ['Alt+D'], linux: ['Alt+D'] },
  decodeJump: { mac: ['⌃⌥⇧D'], win: ['Alt+Shift+D'], linux: ['Alt+Shift+D'] },
  exportGratitude: { mac: ['⌥E', '⌃⌥E'], win: ['Alt+E'], linux: ['Alt+E'] },
  exportBoundary: { mac: ['⌥B', '⌃⌥B'], win: ['Alt+B'], linux: ['Alt+B'] },
  clearLedgers: { mac: ['⌃⌥Backspace'], win: ['Alt+Backspace'], linux: ['Alt+Backspace'] },
  sendToWeave: { mac: ['⌥W'], win: ['Alt+W'], linux: ['Alt+W'] },
  autoSendSketch: { mac: ['⌥⇧W'], win: ['Alt+Shift+W'], linux: ['Alt+Shift+W'] },
  openHotkeys: { mac: ['⇧?'], win: ['Shift+?'], linux: ['Shift+?'] },
  sealMotherline: { mac: ['⌥Enter', '⌘Enter'], win: ['Alt+Enter', 'Ctrl+Enter'], linux: ['Alt+Enter', 'Ctrl+Enter'] },
} satisfies Record<string, PlatformChord>;

export type ChordAction = keyof typeof chordMap;

const isMacPlatform = () =>
  typeof navigator !== 'undefined' && /Mac|iPhone|iPad|iPod/i.test(navigator.platform || navigator.userAgent);

const isLinuxPlatform = () =>
  typeof navigator !== 'undefined' && /Linux|X11/i.test(navigator.platform || navigator.userAgent);

const pickPlatform = () => (isMacPlatform() ? 'mac' : isLinuxPlatform() ? 'linux' : 'win');

export const keyChords = chordMap;

export function chordLabel(action: ChordAction, platform: 'mac' | 'win' | 'linux' = pickPlatform()): string {
  const entry = chordMap[action];
  if (!entry) return '';
  const list = entry[platform] ?? entry.win;
  return list.join(' / ');
}

export function chordAria(action: ChordAction, platform: 'mac' | 'win' | 'linux' = pickPlatform()): string {
  const label = chordLabel(action, platform);
  if (!label) return '';
  const variant = label.split('/')[0]?.trim() ?? label;
  return variant
    .replace(/⌥/g, 'Alt+')
    .replace(/⌃/g, 'Control+')
    .replace(/⇧/g, 'Shift+')
    .replace(/⌘/g, 'Meta+')
    .replace(/\s+/g, '')
    .replace(/\+\+/g, '+')
    .replace(/\+$/, '');
}
