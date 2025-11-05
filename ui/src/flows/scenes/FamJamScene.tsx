import React from 'react';
import { Button, Card, Pill } from '@gratiaos/ui';
import { useSceneLifecycle } from '@/flows/pads/hooks/useSceneLifecycle';

type SceneProps = {
  onNext?: () => void;
};

const PROMPTS = ['What lifted your field today?', 'Who needs extra breath?', 'Which rhythm needs softening?'];

export function FamJamScene({ onNext }: SceneProps) {
  useSceneLifecycle('famjam');
  return (
    <Card className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <p className="text-sm font-semibold uppercase tracking-widest text-subtle">Fam Jam</p>
          <h2 className="text-xl font-semibold text-text">Micro Sync</h2>
          <p className="text-sm text-subtle/80">A three-breath alignment; presence first, outcomes second.</p>
        </div>
        <Pill tone="accent" variant="outline" density="snug">
          03:00 minutes
        </Pill>
      </header>
      <ul className="list-disc space-y-2 ps-6 text-sm text-text/80">
        {PROMPTS.map((prompt) => (
          <li key={prompt}>{prompt}</li>
        ))}
      </ul>
      <footer className="flex items-center justify-end gap-2">
        <Button tone="positive" onClick={onNext}>
          hand to cat town →
        </Button>
      </footer>
    </Card>
  );
}
