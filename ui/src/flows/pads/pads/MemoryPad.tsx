import React, { useEffect } from 'react';
import { useSceneTransition } from '@/flows/pads/hooks/useSceneTransition';
import { GratitudeScene } from '@/flows/scenes/GratitudeScene';
import { BoundaryScene } from '@/flows/scenes/BoundaryScene';
import { setPresenceMood } from '@/presence/presence-kernel';

export function MemoryPad() {
  const { scene, change } = useSceneTransition('gratitude');

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
