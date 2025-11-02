import React, { useEffect } from 'react';
import { usePadRegistry } from '@/hooks/usePadRegistry';
import { useSceneTransition } from '@/hooks/useSceneTransition';
import { GratitudeScene } from '@/scenes/GratitudeScene';
import { BoundaryScene } from '@/scenes/BoundaryScene';
import { setPresenceMood } from '@/presence/presence-kernel';

export function MemoryPad() {
  const { register, unregister } = usePadRegistry();
  const { scene, change } = useSceneTransition('gratitude');

  useEffect(() => {
    register({
      id: 'memory',
      title: 'Memory Core',
      scene,
      setScene: change,
    });
    return () => unregister('memory');
  }, [register, unregister, scene, change]);

  useEffect(() => {
    if (scene === 'gratitude') {
      setPresenceMood('soft');
    } else if (scene === 'boundary') {
      setPresenceMood('focused');
    }
  }, [scene]);

  return (
    <section className="flex flex-col gap-4" data-pad="memory">
      {scene === 'gratitude' && <GratitudeScene onNext={() => change('boundary')} />}
      {scene === 'boundary' && <BoundaryScene onNext={() => change('gratitude')} />}
    </section>
  );
}
