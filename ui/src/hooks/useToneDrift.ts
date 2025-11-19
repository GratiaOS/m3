import { useEffect } from 'react';
import { markAir } from '../flows/feedback/spiritChordStore';

const DAY_MINUTES = 24 * 60;

function lingeredWarmth(t: number) {
  const phase = Math.sin((t - 0.25) * Math.PI * 2);
  const adjusted = Math.pow(Math.abs(phase), 0.8) * Math.sign(phase);
  return adjusted * 0.5 + 0.5;
}

function computePhase() {
  const now = new Date();
  const minutes = now.getHours() * 60 + now.getMinutes();
  const t = minutes / DAY_MINUTES;
  const warmth = lingeredWarmth(t);
  const hue = (warmth - 0.5) * 14; // -7..7
  return { warmth, hue };
}

export function useToneDrift() {
  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const root = document.documentElement;

    if (mq.matches) {
      root.style.removeProperty('--tone-drift-warmth');
      root.style.removeProperty('--tone-drift-hue');
      return;
    }

    const apply = () => {
      const { warmth, hue } = computePhase();
      root.style.setProperty('--tone-drift-warmth', warmth.toFixed(3));
      root.style.setProperty('--tone-drift-hue', hue.toFixed(2));
      markAir();
    };

    const onPrefChange = () => {
      if (mq.matches) {
        root.style.removeProperty('--tone-drift-warmth');
        root.style.removeProperty('--tone-drift-hue');
        return;
      }
      apply();
    };

    apply();
    const interval = window.setInterval(apply, 60_000);
    mq.addEventListener('change', onPrefChange);

    return () => {
      window.clearInterval(interval);
      mq.removeEventListener('change', onPrefChange);
    };
  }, []);
}
