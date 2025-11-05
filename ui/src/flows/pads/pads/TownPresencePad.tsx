import React, { useEffect } from 'react';
import { useSceneTransition } from '@/flows/pads/hooks/useSceneTransition';
import { FamJamScene } from '@/flows/scenes/FamJamScene';
import { CatTownScene } from '@/flows/scenes/CatTownScene';
import { setPresenceMood } from '@/presence/presence-kernel';

export function TownPresencePad() {
  const { scene, change } = useSceneTransition('famjam');

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
