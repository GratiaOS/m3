import { useEffect } from 'react';
import { phase$, pulse$, type Phase } from '@gratiaos/presence-kernel';

/**
 * Bridges shared phase / pulse signals onto <html> so CSS halos can respond.
 */
export function useHaloPulse() {
  useEffect(() => {
    if (typeof document === 'undefined') return undefined;
    const root = document.documentElement;
    let timer: number | null = null;

    const offPhase = phase$.subscribe((next: Phase) => {
      root.dataset.phase = next;
    });

    const offPulse = pulse$.subscribe(() => {
      root.classList.add('is-pulsing');
      if (timer) window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        root.classList.remove('is-pulsing');
        timer = null;
      }, 80);
    });

    return () => {
      if (typeof offPhase === 'function') offPhase();
      if (typeof offPulse === 'function') offPulse();
      if (timer) window.clearTimeout(timer);
      delete root.dataset.phase;
      root.classList.remove('is-pulsing');
    };
  }, []);
}
