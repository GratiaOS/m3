import { FC } from 'react';
import { motion } from 'motion/react';
import { usePhaseBridge } from './usePhaseBridge';
import './hud.css';

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

export const PhaseHUD: FC = () => {
  const { activePadTitle, activeScene, phase } = usePhaseBridge();

  if (!activePadTitle && !activeScene) {
    return null;
  }

  const phaseLabel = LABEL_MAP[phase] ?? phase;

  return (
    <motion.div
      className="phase-hud"
      data-phase={phase}
      animate={{ opacity: 1, scale: [0.98, 1, 0.98] }}
      transition={{ repeat: Infinity, duration: 6, ease: 'easeInOut' }}
    >
      <div className="phase-hud__label">Pad</div>
      <div className="phase-hud__title">{activePadTitle}</div>
      <div className="phase-hud__scene">Scene · {activeScene}</div>
      <div className="phase-hud__phase" aria-live="polite">
        {phaseLabel}
      </div>
    </motion.div>
  );
};
