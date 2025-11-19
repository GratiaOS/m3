import React, { useEffect } from 'react';
import { useSceneTransition } from '@/flows/pads/hooks/useSceneTransition';
import { CoBreathScene } from '@/flows/scenes/CoBreathScene';
import { WeaveScene } from '@/flows/scenes/WeaveScene';
import { EchoSketchScene } from '@/flows/scenes/EchoSketchScene';
import { setPresenceMood } from '@/presence/presence-kernel';
import { startGhostPartner, stopGhostPartner } from '@/flows/games/ghostPartner';
import { PadTabs } from '@/components/PadTabs';
import { setPadScene } from '@/lib/nav';

type GamesPadProps = {
  sceneId?: string | null;
};

export function GamesPad({ sceneId }: GamesPadProps) {
  const { scene, change } = useSceneTransition('cobreath', sceneId);

  useEffect(() => {
    setPresenceMood('soft');
  }, [scene]);

  useEffect(() => {
    startGhostPartner();
    return () => {
      stopGhostPartner();
    };
  }, []);

  const handleChange = (next: 'cobreath' | 'weave' | 'echosketch') => {
    change(next);
    setPadScene('games', next, { announce: `Scene: ${next === 'cobreath' ? 'Co-Breath' : next === 'weave' ? 'Weave' : 'Echo Sketch'}` });
  };

  return (
    <section className="flex flex-col gap-4" data-pad="games">
      <PadTabs
        tabs={[
          { key: 'cobreath', label: 'Co-Breath' },
          { key: 'weave', label: 'Weave' },
          { key: 'echosketch', label: 'Echo Sketch' },
        ]}
        activeKey={scene}
        onChange={handleChange}
        ariaLabel="Games pad scenes"
      />
      {scene === 'cobreath' && <CoBreathScene />}
      {scene === 'weave' && <WeaveScene />}
      {scene === 'echosketch' && <EchoSketchScene />}
    </section>
  );
}
