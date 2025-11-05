import React from 'react';
import { Button, Card, Field } from '@gratiaos/ui';
import { useSceneLifecycle } from '@/flows/pads/hooks/useSceneLifecycle';

type SceneProps = {
  onNext?: () => void;
};

export function CatTownScene({ onNext }: SceneProps) {
  useSceneLifecycle('cat-town');
  return (
    <Card className="space-y-4">
      <header className="space-y-2">
        <p className="text-sm font-semibold uppercase tracking-widest text-subtle">Town Pad</p>
        <h2 className="text-xl font-semibold text-text">CatTown Whisper</h2>
        <p className="text-sm text-subtle">Send a single-line bulletin to the neighborhood. Presence carries the tone.</p>
      </header>
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(140px,0.5fr)]">
        <Field label="Voice handle" description="format: species:name">
          {(ariaProps) => <input {...ariaProps} className="input-base" placeholder="cat:sunbeam" />}
        </Field>
        <Field label="Mood">
          {(ariaProps) => (
            <select {...ariaProps} className="input-base">
              <option value="soft">Soft</option>
              <option value="focused">Focused</option>
              <option value="celebratory">Celebrate</option>
            </select>
          )}
        </Field>
      </div>
      <Field label="Whisper">
        {(ariaProps) => (
          <textarea {...ariaProps} className="input-base w-full" rows={2} placeholder="“Sunbeam shifts to the couch at 14:00.”" />
        )}
      </Field>
      <footer className="flex items-center justify-end gap-2">
        <Button tone="accent">post whisper</Button>
        <Button variant="outline" onClick={onNext}>
          integration →
        </Button>
      </footer>
    </Card>
  );
}
