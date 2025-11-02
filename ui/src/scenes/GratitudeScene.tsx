import React from 'react';
import { Button, Card, Field } from '@gratiaos/ui';

type SceneProps = {
  onNext?: () => void;
};

export function GratitudeScene({ onNext }: SceneProps) {
  return (
    <Card className="space-y-4">
      <header className="space-y-2">
        <p className="text-sm font-semibold text-subtle uppercase tracking-widest">Memory Pad</p>
        <h2 className="text-xl font-semibold text-text">Gratitude</h2>
        <p className="text-sm text-subtle">Seal one line of thanks. Presence carries the resonance.</p>
      </header>
      <Field label="Thank you for">
        {(ariaProps) => <textarea {...ariaProps} rows={3} className="input-base w-full" placeholder="The whisper that grounded me…" />}
      </Field>
      <div className="flex items-center justify-end gap-2">
        <Button variant="outline" onClick={onNext}>
          boundary →
        </Button>
      </div>
    </Card>
  );
}
