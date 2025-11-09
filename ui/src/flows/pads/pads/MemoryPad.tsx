import React, { useCallback, useEffect } from 'react';
import { useSceneTransition } from '@/flows/pads/hooks/useSceneTransition';
import { GratitudeScene } from '@/flows/scenes/GratitudeScene';
import { BoundaryScene } from '@/flows/scenes/BoundaryScene';
import { DecodeScene } from '@/flows/scenes/DecodeScene';
import { setPresenceMood } from '@/presence/presence-kernel';
import { useSignalSelector } from '@/lib/useSignal';
import { consent$, depth$, setConsent, setDepth, type Depth } from '@/flows/relational/relationalAlignment';

type MemoryPadProps = {
  sceneId?: string | null;
};

export function MemoryPad({ sceneId }: MemoryPadProps) {
  const { scene, change } = useSceneTransition('gratitude', sceneId);
  const consentOn = useSignalSelector(consent$, (value) => value);
  const depth = useSignalSelector(depth$, (value) => value);

  useEffect(() => {
    if (scene === 'gratitude') {
      setPresenceMood('soft');
    } else if (scene === 'boundary') {
      setPresenceMood('focused');
    } else if (scene === 'decode') {
      setPresenceMood('focused');
    }
  }, [scene]);

  useEffect(() => {
    if (depth === 'soft' && scene === 'decode') {
      change('boundary');
    }
  }, [depth, scene, change]);

  const toggleConsent = useCallback(() => {
    setConsent(!consentOn);
  }, [consentOn]);

  const cycleDepth = useCallback(() => {
    const nextDepth: Depth = depth === 'soft' ? 'deep' : 'soft';
    setDepth(nextDepth);
  }, [depth]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (!event.altKey || event.metaKey || event.ctrlKey || event.shiftKey) return;
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return;
      const key = event.key.toLowerCase();
      if (key === 'm') {
        event.preventDefault();
        toggleConsent();
      } else if (key === 'd') {
        event.preventDefault();
        cycleDepth();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [toggleConsent, cycleDepth]);

  const handleNav = (targetScene: 'gratitude' | 'boundary' | 'decode') => {
    if (targetScene === 'decode' && depth !== 'deep') return;
    change(targetScene);
  };

  return (
    <section className="memory-pad" data-pad="memory">
      <header className="pad-head">
        <div>
          <p className="pad-label">Memory pad</p>
          <p className="pad-hint">Gratitude, boundaries, decode rituals.</p>
        </div>
        <div className="pad-actions">
          <button
            type="button"
            role="switch"
            aria-checked={consentOn}
            onClick={toggleConsent}
            title="Toggle memory consent (Alt+M)">
            {consentOn ? 'Memory: On' : 'Memory: Off'}
          </button>
          <div className="depth-toggle" role="radiogroup" aria-label="Depth">
            <button
              type="button"
              aria-pressed={depth === 'soft'}
              onClick={() => setDepth('soft')}
              title="Soft depth (Alt+D)">
              Soft
            </button>
            <button
              type="button"
              aria-pressed={depth === 'deep'}
              onClick={() => setDepth('deep')}
              title="Deep depth (Alt+D)">
              Deep
            </button>
          </div>
        </div>
      </header>

      <nav className="memory-nav" aria-label="Memory scenes">
        <button type="button" data-active={scene === 'gratitude'} onClick={() => handleNav('gratitude')}>
          Gratitude
        </button>
        <button type="button" data-active={scene === 'boundary'} onClick={() => handleNav('boundary')}>
          Boundary
        </button>
        {depth === 'deep' && (
          <button type="button" data-active={scene === 'decode'} onClick={() => handleNav('decode')}>
            Decode
          </button>
        )}
      </nav>

      {scene === 'gratitude' && <GratitudeScene />}
      {scene === 'boundary' && (
        <BoundaryScene onBack={() => change('gratitude')} onNext={depth === 'deep' ? () => change('decode') : undefined} />
      )}
      {scene === 'decode' && (depth === 'deep' ? <DecodeScene onBack={() => change('gratitude')} /> : <DecodeGuardCard />)}
    </section>
  );
}
