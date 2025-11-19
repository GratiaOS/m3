const detectMac = () => {
  if (typeof navigator === 'undefined') return false;
  const platform = navigator.platform || navigator.userAgent;
  return /Mac|iPhone|iPad|iPod/i.test(platform);
};

export const isMac = detectMac();

export const inEditable = (target: EventTarget | null) => {
  const el = target as HTMLElement | null;
  if (!el) return false;
  return Boolean(el.closest('input, textarea, [contenteditable=""], [contenteditable="true"]'));
};

export type ChordId =
  | 'memoryToggle'
  | 'depthCycle'
  | 'decodeJump'
  | 'sendToWeave'
  | 'openHotkeys'
  | 'sealMotherline';

type Matcher = (event: KeyboardEvent) => boolean;

const key = (k: string) => (event: KeyboardEvent) => event.key.toLowerCase() === k;
const alt = (event: KeyboardEvent) => event.altKey;
const ctrl = (event: KeyboardEvent) => event.ctrlKey;
const shift = (event: KeyboardEvent) => event.shiftKey;
const meta = (event: KeyboardEvent) => event.metaKey;

const withMods = (
  ...mods: Array<(event: KeyboardEvent) => boolean>
) =>
(event: KeyboardEvent) =>
  mods.every((mod) => mod(event));

const withCombo = (...mods: Array<(event: KeyboardEvent) => boolean>) => (k: string): Matcher => {
  const checkMods = withMods(...mods);
  return (event) => checkMods(event) && key(k)(event);
};

const or = (...matchers: Matcher[]) => (event: KeyboardEvent) => matchers.some((matcher) => matcher(event));

const chords: Record<ChordId, { mac: Matcher; win: Matcher }> = {
  memoryToggle: {
    mac: or(withCombo(alt)('m'), withCombo(ctrl, alt)('m')),
    win: withCombo(alt)('m'),
  },
  depthCycle: {
    mac: or(withCombo(alt)('d'), withCombo(ctrl, alt)('d')),
    win: withCombo(alt)('d'),
  },
  decodeJump: {
    mac: withCombo(ctrl, alt, shift)('d'),
    win: withCombo(alt, shift)('d'),
  },
  sendToWeave: {
    mac: withCombo(alt)('w'),
    win: withCombo(alt)('w'),
  },
  openHotkeys: {
    mac: (event) => event.key === '?' && event.shiftKey,
    win: (event) => event.key === '?' && event.shiftKey,
  },
  sealMotherline: {
    mac: or(withCombo(alt)('enter'), withCombo(meta)('enter')),
    win: or(withCombo(alt)('enter'), withCombo(ctrl)('enter')),
  },
};

type MatchOpts = {
  allowEditable?: boolean;
};

export function matchesChord(event: KeyboardEvent, chord: ChordId, opts: MatchOpts = {}): boolean {
  if (!opts.allowEditable && inEditable(event.target)) return false;
  return (isMac ? chords[chord].mac : chords[chord].win)(event);
}
