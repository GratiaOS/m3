import React, { useCallback, useEffect } from 'react';
import { useSceneTransition } from '@/flows/pads/hooks/useSceneTransition';
import { GratitudeScene } from '@/flows/scenes/GratitudeScene';
import { BoundaryScene } from '@/flows/scenes/BoundaryScene';
import { DecodeScene } from '@/flows/scenes/DecodeScene';
import { CodexScene } from '@/flows/scenes/CodexScene';
import { setPresenceMood } from '@/presence/presence-kernel';
import { useSignalSelector } from '@/lib/useSignal';
import { consent$, depth$, hints$, setConsent, setDepth, type Depth, markMemoryHintSeen } from '@/flows/relational/relationalAlignment';
import { matchesChord, isMac } from '@/lib/hotkeys';
import { chordLabel } from '@/lib/keyChords';
import { chordAttr, chordTitle } from '@/lib/chordUi';
import { MotherlineScene } from '@/flows/scenes/MotherlineScene';
import { setPadScene } from '@/lib/nav';

type MemoryPadProps = {
  sceneId?: string | null;
};

export function MemoryPad({ sceneId }: MemoryPadProps) {
  const { scene, change } = useSceneTransition('gratitude', sceneId);
  const consentOn = useSignalSelector(consent$, (value) => value);
  const depth = useSignalSelector(depth$, (value) => value);
  const memoryHintSeen = useSignalSelector(hints$, (value) => value.memoryHintSeen);
  const hintShortcut = chordLabel('memoryToggle');

  useEffect(() => {
    if (scene === 'gratitude') {
      setPresenceMood('soft');
    } else if (scene === 'boundary') {
      setPresenceMood('focused');
    } else if (scene === 'decode') {
      setPresenceMood('focused');
    } else if (scene === 'codex') {
      setPresenceMood('focused');
    } else if (scene === 'motherline') {
      setPresenceMood('soft');
    } else {
      setPresenceMood('focused');
    }
  }, [scene]);

  const toggleConsent = useCallback(() => {
    setConsent(!consentOn);
  }, [consentOn]);

  const cycleDepth = useCallback(() => {
    const nextDepth: Depth = depth === 'soft' ? 'deep' : 'soft';
    setDepth(nextDepth);
  }, [depth]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (matchesChord(event, 'memoryToggle')) {
        event.preventDefault();
        toggleConsent();
        return;
      }
      if (matchesChord(event, 'depthCycle')) {
        event.preventDefault();
        cycleDepth();
        return;
      }
      if (matchesChord(event, 'decodeJump')) {
        event.preventDefault();
        setPadScene('memory', 'decode', { announce: 'Scene: Decode' });
        requestAnimationFrame(() => {
          const el = document.getElementById('decode-incoming') as HTMLTextAreaElement | null;
          if (el) {
            el.focus();
            el.select?.();
          }
        });
        return;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [toggleConsent, cycleDepth]);

  useEffect(() => {
    if (memoryHintSeen) return;
    const onHintDismiss = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        markMemoryHintSeen();
      }
    };
    window.addEventListener('keydown', onHintDismiss);
    return () => window.removeEventListener('keydown', onHintDismiss);
  }, [memoryHintSeen]);

  const handleNav = useCallback(
    (targetScene: 'gratitude' | 'boundary' | 'decode' | 'codex' | 'motherline', announceLabel?: string) => {
      if (targetScene === 'decode' && depth !== 'deep') return;
      change(targetScene);
      setPadScene('memory', targetScene, announceLabel ? { announce: announceLabel } : undefined);
    },
    [change, depth]
  );

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
            {...chordAttr('memoryToggle')}
            title={chordTitle('memoryToggle', 'Toggle Memory')}>
            {consentOn ? 'Memory: On' : 'Memory: Off'}
          </button>
          <div className="depth-toggle" role="radiogroup" aria-label="Depth">
            <button
              type="button"
              aria-pressed={depth === 'soft'}
              onClick={() => setDepth('soft')}
              {...chordAttr('depthCycle')}
              title={chordTitle('depthCycle', 'Set depth to Soft')}>
              Soft
            </button>
            <button
              type="button"
              aria-pressed={depth === 'deep'}
              onClick={() => setDepth('deep')}
              {...chordAttr('depthCycle')}
              title={chordTitle('depthCycle', 'Set depth to Deep')}>
              Deep
            </button>
          </div>
        </div>
      </header>

      <nav className="memory-nav" aria-label="Memory scenes">
        <button type="button" data-active={scene === 'gratitude'} onClick={() => handleNav('gratitude', 'Scene: Gratitude')}>
          Gratitude
        </button>
        <button type="button" data-active={scene === 'boundary'} onClick={() => handleNav('boundary', 'Scene: Boundary')}>
          Boundary
        </button>
        {depth === 'deep' && (
          <button type="button" data-active={scene === 'decode'} onClick={() => handleNav('decode', 'Scene: Decode')}>
            Decode
          </button>
        )}
        <button type="button" data-active={scene === 'codex'} onClick={() => handleNav('codex', 'Scene: Codex')}>
          Codex
        </button>
        <button type="button" data-active={scene === 'motherline'} onClick={() => handleNav('motherline', 'Scene: Motherline')}>
          Motherline
        </button>
      </nav>

      {scene === 'gratitude' && (
        <>
          {!consentOn && !memoryHintSeen && (
            <div className="memory-hint" role="note" aria-live="polite">
              <span>Turn on Memory to remember this after refresh.</span>
              <kbd>{hintShortcut}</kbd>
              <button type="button" className="memory-hint__dismiss" onClick={markMemoryHintSeen}>
                Got it
              </button>
            </div>
          )}
          <GratitudeScene />
        </>
      )}
      {scene === 'boundary' && (
        <BoundaryScene onBack={() => change('gratitude')} onNext={depth === 'deep' ? () => change('decode') : undefined} />
      )}
      {scene === 'decode' && (depth === 'deep' ? <DecodeScene onBack={() => change('gratitude')} /> : <DecodeGuardCard />)}
      {scene === 'codex' && <CodexScene />}
      {scene === 'motherline' && <MotherlineScene />}
    </section>
  );
}
