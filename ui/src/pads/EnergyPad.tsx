import React, { useEffect } from 'react';
import { Button, Card } from '@gratiaos/ui';
import { usePadRegistry } from '@/hooks/usePadRegistry';
import { useSceneTransition } from '@/hooks/useSceneTransition';
import { IntegrationScene } from '@/scenes/IntegrationScene';
import { setPresenceMood } from '@/presence/presence-kernel';

export function EnergyPad() {
  const { register, unregister } = usePadRegistry();
  const { scene, change } = useSceneTransition('integration');

  useEffect(() => {
    register({
      id: 'energy',
      title: 'Energy Pad',
      scene,
      setScene: change,
    });
    return () => unregister('energy');
  }, [register, unregister, scene, change]);

  useEffect(() => {
    if (scene !== 'integration') {
      change('integration');
      setPresenceMood('presence');
      return;
    }
    setPresenceMood('presence');
  }, [scene, change]);

  return (
    <section className="flex flex-col gap-4" data-pad="energy">
      <IntegrationScene onRestart={() => change('integration')} />
      <Card className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-text">Crown • Void • Dragon • Play</p>
          <p className="text-xs text-subtle">Quick toggles for the four energy pillars.</p>
        </div>
        <Button tone="accent" variant="outline">
          open pillars
        </Button>
      </Card>
    </section>
  );
}
