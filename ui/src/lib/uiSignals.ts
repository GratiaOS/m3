import { useSyncExternalStore } from 'react';

let hotkeysOpen = false;
const listeners = new Set<() => void>();

const emit = () => {
  listeners.forEach((listener) => {
    try {
      listener();
    } catch {
      /* noop */
    }
  });
};

export function setHotkeysOpen(value: boolean) {
  if (hotkeysOpen === value) return;
  hotkeysOpen = value;
  emit();
}

export function toggleHotkeysOpen() {
  setHotkeysOpen(!hotkeysOpen);
}

export function useHotkeysOpen() {
  return useSyncExternalStore(
    (onStoreChange) => {
      listeners.add(onStoreChange);
      return () => listeners.delete(onStoreChange);
    },
    () => hotkeysOpen,
    () => hotkeysOpen,
  );
}
