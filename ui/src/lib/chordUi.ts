import { chordLabel, chordAria, type ChordAction } from './keyChords';

export type ActionKey = ChordAction;

export function chordTitle(action: ActionKey, verb?: string): string {
  const label = chordLabel(action);
  if (!verb) return label;
  return label ? `${verb} (${label})` : verb;
}

export function chordAttr(action: ActionKey) {
  const label = chordLabel(action);
  if (!label) return {};
  const aria = chordAria(action);
  return {
    'data-chord': label,
    title: label,
    ...(aria ? { 'aria-keyshortcuts': aria } : {}),
  };
}
