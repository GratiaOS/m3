// Energy engine: types + next-move suggestions

export type Energy = 'crown' | 'play' | 'dragon' | 'void' | 'life';

export const ENERGY_ORDER: Energy[] = ['crown', 'play', 'life', 'dragon', 'void'];

export const ENERGY_LABEL: Record<Energy, string> = {
  crown: 'Crown',
  play: 'Play',
  dragon: 'Dragon',
  void: 'Void',
  life: 'Life Force',
};

export type Suggestion = { title: string; steps: string[]; shortcut?: string };

// Low‑Noise Integration — used when field is dense / audio muted / toast needs clarity.
// Triggers automatically when the last energy logged is `void` or `crown`.
export const LOW_NOISE_INTEGRATION: Suggestion = {
  title: 'Low‑Noise Integration',
  steps: [
    'Cut high‑freq inputs (audio off, tabs minimal).',
    'Anchor in a stable physical spot (chair/window).',
    'Log current energy (tap to confirm).',
    'Run a 15–20 min quiet focus burst.',
    'Reintroduce sound in layers (ambient → soft beat → play).',
  ],
  shortcut: 'integration-mode',
};

export function suggestNext(history: Energy[]): Suggestion {
  if (!history || history.length === 0) {
    return {
      title: 'Start',
      steps: ['Tap any energy to begin mapping.', 'Keep events short & specific.'],
    };
  }

  const last = history[history.length - 1];

  // Auto-swap to Low‑Noise Integration when clearing (void) or stabilizing (crown)
  if (last === 'void' || last === 'crown') {
    return LOW_NOISE_INTEGRATION;
  }

  switch (last) {
    case 'dragon':
      return {
        title: 'Dragon → Void → Life Force (counter)',
        steps: [
          'Name the spike: “I see the Dragon.”',
          'Shift Void from freeze to **observe with intent**.',
          'Insert a micro‑Play (joke, 10s dance) to kick Life Force.',
        ],
        shortcut: 'Humor collapses Void fast.',
      };
    case 'life':
      return {
        title: 'Life Force → (guard against) Dragon',
        steps: [
          'Seal the win physically (hug/toast/object).',
          'Name the win so it sticks as “shield story”.',
          'If Dragon shows up, reference the sealed moment.',
        ],
      };
    case 'play':
      return {
        title: 'Play → Crown',
        steps: [
          'Channel Play into a shared signal (view/sound/moment).',
          'Keep it inclusive so Crown can land.',
          'Hold 3–5s silence when Crown appears (let it imprint).',
        ],
        shortcut: 'Play + tiny pause = cheat code.',
      };
    default:
      return {
        title: 'Start',
        steps: ['Tap any energy to begin mapping.', 'Keep events short & specific.'],
      };
  }
}

export const MICRO_PLAYS = [
  '10s dance / sync clap',
  '1-sentence gratitude',
  'Two-choice mini game',
  'Funny misread / nickname',
  'Shared photo moment',
];
