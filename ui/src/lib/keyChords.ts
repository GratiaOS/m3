export type ChordAction = 'toggleMemory' | 'cycleDepth' | 'jumpDecode';

const CHORD_MAP: Record<ChordAction, { mac: string; other: string }> = {
  toggleMemory: { mac: '⌥M / ⌃⌥M', other: 'Alt+M' },
  cycleDepth: { mac: '⌥D / ⌃⌥D', other: 'Alt+D' },
  jumpDecode: { mac: '⌃⌥⇧D', other: 'Alt+Shift+D' },
};

const isMacPlatform = () =>
  typeof navigator !== 'undefined' && /Mac|iPhone|iPad|iPod/i.test(navigator.platform || navigator.userAgent);

export function chordLabel(action: ChordAction, isMac = isMacPlatform()): string {
  const map = CHORD_MAP[action];
  return isMac ? map.mac : map.other;
}
