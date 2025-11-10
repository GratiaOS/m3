let node: HTMLElement | null = null;

const ensureNode = () => {
  if (node) return node;
  if (typeof document === 'undefined') return null;
  node = document.createElement('div');
  node.id = 'sr-announcer';
  node.setAttribute('aria-live', 'polite');
  node.setAttribute('aria-atomic', 'true');
  node.className = 'sr-only';
  document.body.appendChild(node);
  return node;
};

export function mountSrAnnouncer() {
  ensureNode();
}

export function announce(message: string) {
  const target = ensureNode();
  if (!target) return;
  target.textContent = '';
  window.setTimeout(() => {
    if (node) node.textContent = message;
  }, 30);
}
