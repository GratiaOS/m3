import { useRef, useCallback } from 'react';

export function useSceneBloom<T extends HTMLElement>() {
  const cleanupRef = useRef<(() => void) | null>(null);

  const setRef = useCallback((el: T | null) => {
    cleanupRef.current?.();

    if (!el) {
      cleanupRef.current = null;
      return;
    }

    el.classList.add('entering');
    const handle = () => el.classList.remove('entering');
    el.addEventListener('animationend', handle, { once: true });
    cleanupRef.current = () => {
      el.removeEventListener('animationend', handle);
      el.classList.remove('entering');
    };
  }, []);

  return setRef;
}
