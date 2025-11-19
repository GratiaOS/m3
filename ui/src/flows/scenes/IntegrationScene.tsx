import React from 'react';
import { Button, Card } from '@gratiaos/ui';
import { useSceneLifecycle } from '@/flows/pads/hooks/useSceneLifecycle';

type SceneProps = {
  onRestart?: () => void;
};

export function IntegrationScene({ onRestart }: SceneProps) {
  useSceneLifecycle('integration');
  return (
    <Card className="space-y-4">
      <header className="space-y-1">
        <p className="text-sm font-semibold uppercase tracking-widest text-subtle">Integration</p>
        <h2 className="text-xl font-semibold text-text">Energy Landing</h2>
        <p className="text-sm text-subtle">Close the orbit: note what moved, breathe, decide which pad holds the next action.</p>
      </header>
      <ul className="grid gap-2 text-sm text-text/80">
        <li>• Crown field steady?</li>
        <li>• Is the bridge balanced?</li>
        <li>• Does the dragon need another pass?</li>
      </ul>
      <footer className="flex items-center justify-end">
        <Button tone="positive" onClick={onRestart}>
          restart cycle
        </Button>
      </footer>
    </Card>
  );
}
