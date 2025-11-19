let decayTimer: number | undefined;

type Options = {
  decayMs?: number;
  target?: HTMLElement;
};

export function installKeyboardMode(opts: Options = {}) {
  const target = opts.target ?? document.documentElement;
  const decayMs = opts.decayMs ?? 3000;

  const clear = () => {
    if (decayTimer) {
      clearTimeout(decayTimer);
      decayTimer = undefined;
    }
    delete target.dataset.kbm;
  };

  const inTextControl = (event: KeyboardEvent) => {
    const el = event.target as HTMLElement | null;
    if (!el) return false;
    return Boolean(el.closest('input, textarea, select, [contenteditable=""], [contenteditable="true"]'));
  };

  const onKey = (event: KeyboardEvent) => {
    if (inTextControl(event)) return;
    if (event.key === 'Shift' || event.key === 'Alt' || event.key === 'Control' || event.key === 'Meta') return;
    target.dataset.kbm = '1';
    if (decayTimer) clearTimeout(decayTimer);
    decayTimer = window.setTimeout(clear, decayMs);
  };

  const onPoint = () => clear();
  const onVisibility = () => {
    if (document.hidden) clear();
  };

  window.addEventListener('keydown', onKey, { passive: true });
  window.addEventListener('pointerdown', onPoint, { passive: true });
  window.addEventListener('touchstart', onPoint, { passive: true });
  document.addEventListener('visibilitychange', onVisibility);

  return () => {
    window.removeEventListener('keydown', onKey);
    window.removeEventListener('pointerdown', onPoint);
    window.removeEventListener('touchstart', onPoint);
    document.removeEventListener('visibilitychange', onVisibility);
    clear();
  };
}
