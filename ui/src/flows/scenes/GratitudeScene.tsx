import React from 'react';
import { Button, Card } from '@gratiaos/ui';
import { useSceneLifecycle } from '@/flows/pads/hooks/useSceneLifecycle';
import { Field as FloatingField } from '../presence/placeholders/Field';

type SceneProps = {
  onNext?: () => void;
};

export function GratitudeScene({ onNext }: SceneProps) {
  useSceneLifecycle('gratitude');
  return (
    <Card className="space-y-4">
      <header className="space-y-2">
        <p className="text-sm font-semibold text-subtle uppercase tracking-widest">Memory Pad</p>
        <h2 className="text-xl font-semibold text-text">Gratitude</h2>
        <p className="text-sm text-subtle">Seal one line of thanks. Presence carries the resonance.</p>
      </header>
      <FloatingField id="gratitude-entry" label="Gratitude" hint="Thank you for…" as="textarea" rows={3} tint="none" />
      <div className="flex items-center justify-end gap-2">
        <Button variant="outline" onClick={onNext}>
          boundary →
        </Button>
      </div>
    </Card>
  );
}
