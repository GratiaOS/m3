import React from 'react';
import { Button, Card, Field } from '@gratiaos/ui';
import { useSceneLifecycle } from '@/flows/pads/hooks/useSceneLifecycle';

type SceneProps = {
  onNext?: () => void;
  onBack?: () => void;
};

export function BoundaryScene({ onNext, onBack }: SceneProps) {
  useSceneLifecycle('boundary');
  return (
    <Card className="space-y-4">
      <header className="space-y-2">
        <p className="text-sm font-semibold text-subtle uppercase tracking-widest">Memory Pad</p>
        <h2 className="text-xl font-semibold text-text">Boundary Composer</h2>
        <p className="text-sm text-subtle">Draft the edges that keep your field sovereign. Publish when the wording feels true.</p>
      </header>
      <Field label="Boundary statement">
        {(ariaProps) => (
          <textarea
            {...ariaProps}
            rows={4}
            className="input-base w-full halo"
            data-halo
            placeholder="“My rest window is 22:00–07:00. Please honor it.”"
          />
        )}
      </Field>
      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button tone="accent" variant="solid">
          queue boundary
        </Button>
        {onBack && (
          <Button variant="outline" onClick={onBack}>
            back to gratitude
          </Button>
        )}
        {onNext && (
          <Button variant="outline" onClick={onNext}>
            decode →
          </Button>
        )}
      </div>
    </Card>
  );
}
