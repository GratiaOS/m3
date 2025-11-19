import { useEffect } from 'react';
import { touchWaterEcho } from '../flows/feedback/waterEchoStore';

export function useWaterEchoTouch() {
  useEffect(() => {
    const touch = () => touchWaterEcho();
    window.addEventListener('pointerdown', touch, true);
    window.addEventListener('pointermove', touch, true);
    window.addEventListener('keydown', touch, true);
    window.addEventListener('input', touch, true);
    return () => {
      window.removeEventListener('pointerdown', touch, true);
      window.removeEventListener('pointermove', touch, true);
      window.removeEventListener('keydown', touch, true);
      window.removeEventListener('input', touch, true);
    };
  }, []);
}
