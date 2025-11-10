let node: HTMLElement | null = null;
let lastAt = 0;
let lastText = '';
let pendingTimeout: number | null = null;

const ensureNode = () => {
  if (node) return node;
  if (typeof document === 'undefined') return null;
  node = document.createElement('div');
  node.id = 'sr-announcer';
  node.setAttribute('role', 'status');
  node.setAttribute('aria-live', 'polite');
  node.setAttribute('aria-atomic', 'true');
  node.className = 'sr-only';
  document.body.appendChild(node);
  return node;
};

export function mountSrAnnouncer() {
  ensureNode();
}

const setText = (message: string) => {
  if (!node) return;
  node.textContent = '';
  window.setTimeout(() => {
    if (node) node.textContent = message;
  }, 20);
  lastAt = performance.now();
  lastText = message;
};

export type AnnounceOpts = {
  minGap?: number;
  coalesceMs?: number;
};

export function announce(message: string, opts: AnnounceOpts = {}) {
  if (typeof document === 'undefined' || document.hidden) return;
  if (!ensureNode()) return;

  const now = performance.now();
  const minGap = opts.minGap ?? 800;
  const coalesceMs = opts.coalesceMs ?? 1500;

  if (message === lastText && now - lastAt < coalesceMs) return;

  const elapsed = now - lastAt;
  if (elapsed < minGap) {
    if (pendingTimeout !== null) {
      window.clearTimeout(pendingTimeout);
    }
    pendingTimeout = window.setTimeout(() => setText(message), minGap - elapsed);
    return;
  }

  setText(message);
}
