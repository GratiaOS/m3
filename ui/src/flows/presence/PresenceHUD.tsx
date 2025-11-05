import { FC, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { pulse$ } from '@gratiaos/presence-kernel';
import { usePhaseBridge } from './usePhaseBridge';
import './presence-hud.css';

const LABEL_MAP: Record<string, string> = {
  soft: 'Soft',
  focused: 'Focused',
  celebratory: 'Celebratory',
  presence: 'Presence',
  positive: 'Positive',
  warning: 'Warning',
  danger: 'Danger',
  accent: 'Accent',
};

export const PresenceHUD: FC = () => {
  const { activePadTitle, activeScene, phase } = usePhaseBridge();
  const liveRef = useRef<HTMLDivElement>(null);

  if (!activePadTitle && !activeScene) {
    return null;
  }

  const phaseLabel = LABEL_MAP[phase] ?? phase;

  useEffect(() => {
    const target = liveRef.current;
    if (target) {
      target.textContent = `Phase ${phaseLabel}`;
    }
    const unsubscribe = pulse$.subscribe(() => {
      const el = liveRef.current;
      if (!el) return;
      el.textContent = `Phase ${phaseLabel}`;
    });
    return () => {
      unsubscribe();
    };
  }, [phaseLabel]);

  return (
    <>
      <motion.div
        className="phase-hud"
        data-phase={phase}
        animate={{ opacity: 1, scale: [0.98, 1, 0.98] }}
        transition={{ repeat: Infinity, duration: 6, ease: 'easeInOut' }}
      >
        <div className="phase-hud__label">Pad</div>
        <div className="phase-hud__title">{activePadTitle}</div>
        <div className="phase-hud__scene">Scene · {activeScene}</div>
        <div className="phase-hud__phase">{phaseLabel}</div>
      </motion.div>
      <div ref={liveRef} aria-live="polite" aria-atomic="true" className="sr-only">
        Phase {phaseLabel}
      </div>
    </>
  );
};
