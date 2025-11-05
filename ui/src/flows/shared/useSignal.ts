/**
 * Tiny React hook to subscribe to pad-core style signals.
 * Accepts any object exposing a `subscribe` method (returning either
 * an unsubscribe function or an object with `unsubscribe` / `dispose`)
 * and optionally reads the current `.value` when available.
 */
import { useEffect, useState } from 'react';

type SubscriptionCleanup =
  | (() => void)
  | { unsubscribe?: () => void; dispose?: () => void }
  | void;

type Subscribable<T> = {
  subscribe: (listener: (value: T) => void) => SubscriptionCleanup;
  value?: T;
};

export function useSignal<T>(signal: Subscribable<T>, fallback: T): T {
  const [value, setValue] = useState<T>(() => (signal?.value ?? fallback));

  useEffect(() => {
    if (!signal?.subscribe) return undefined;
    const cleanup = signal.subscribe(setValue);
    if (typeof cleanup === 'function') return cleanup;
    if (cleanup?.unsubscribe) return () => cleanup.unsubscribe?.();
    if (cleanup?.dispose) return () => cleanup.dispose?.();
    return undefined;
  }, [signal]);

  return value;
}
