import React, { useEffect } from 'react';
import { usePadRegistry } from '@/hooks/usePadRegistry';
import { useSceneTransition } from '@/hooks/useSceneTransition';
import { FamJamScene } from '@/scenes/FamJamScene';
import { CatTownScene } from '@/scenes/CatTownScene';
import { setPresenceMood } from '@/presence/presence-kernel';

export function TownPresencePad() {
  const { register, unregister } = usePadRegistry();
  const { scene, change } = useSceneTransition('famjam');

  useEffect(() => {
    register({
      id: 'towns',
      title: 'Town Presence',
      scene,
      setScene: change,
    });
    return () => unregister('towns');
  }, [register, unregister, scene, change]);

  useEffect(() => {
    if (scene === 'famjam') {
      setPresenceMood('presence');
    } else if (scene === 'cat-town') {
      setPresenceMood('celebratory');
    } else if (scene === 'integration') {
      setPresenceMood('soft');
    }
  }, [scene]);

  return (
    <section className="flex flex-col gap-4" data-pad="towns">
      {scene === 'famjam' && <FamJamScene onNext={() => change('cat-town')} />}
      {scene === 'cat-town' && <CatTownScene onNext={() => change('integration')} />}
    </section>
  );
}
