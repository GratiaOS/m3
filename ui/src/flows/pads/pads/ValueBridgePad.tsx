import React, { useEffect } from 'react';
import { Button, Card } from '@gratiaos/ui';
import { useSceneTransition } from '@/flows/pads/hooks/useSceneTransition';
import { setPresenceMood } from '@/presence/presence-kernel';

type ValueBridgePadProps = {
  sceneId?: string | null;
};

export function ValueBridgePad({ sceneId }: ValueBridgePadProps) {
  const { scene, change } = useSceneTransition('ledger', sceneId);

  useEffect(() => {
    if (scene === 'ledger') {
      setPresenceMood('focused');
    }
  }, [scene]);

  return (
    <section className="flex flex-col gap-4" data-pad="value-bridge">
      <Card className="space-y-3">
        <header className="space-y-1">
          <p className="text-sm font-semibold uppercase tracking-widest text-subtle">Value Bridge</p>
          <h2 className="text-xl font-semibold text-text">Ledger &amp; Currencies</h2>
          <p className="text-sm text-subtle">Track commitments, reciprocity, and bridge states in one glance.</p>
        </header>
        <div className="grid gap-3 text-sm text-subtle/90 sm:grid-cols-2">
          <div className="rounded-xl border border-border/40 bg-surface/80 p-3">
            <p className="font-semibold text-text">Bridge Balance</p>
            <p>+32 gratitude credits</p>
          </div>
          <div className="rounded-xl border border-border/40 bg-surface/80 p-3">
            <p className="font-semibold text-text">Reciprocity</p>
            <p>Awaiting 2 acknowledgements</p>
          </div>
        </div>
        <footer className="flex items-center justify-end gap-2">
          <Button tone="accent" onClick={() => change('ledger')}>
            reconcile
          </Button>
        </footer>
      </Card>
    </section>
  );
}
