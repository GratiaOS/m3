import { chordLabel, type ChordAction } from './keyChords';

export type ActionKey = ChordAction;

export function chordTitle(action: ActionKey, verb: string): string {
  const label = chordLabel(action);
  return label ? `${verb} (${label})` : verb;
}

export function chordAttr(action: ActionKey) {
  const label = chordLabel(action);
  return label ? ({ 'data-chord': label, title: label } as const) : ({} as const);
}
