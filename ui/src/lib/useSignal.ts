import { useSyncExternalStore } from 'react';

type Signal<T> = {
  value: T;
  subscribe: (fn: () => void) => () => void;
};

export function useSignal<T>(sig: Signal<T>): T {
  return useSyncExternalStore(
    (onStoreChange) => sig.subscribe(onStoreChange),
    () => sig.value,
    () => sig.value
  );
}

export function shallowEqual<T extends Record<string, unknown> | Array<unknown>>(a: T, b: T): boolean {
  if (Object.is(a, b)) return true;
  if (!a || !b) return false;
  if (typeof a !== 'object' || typeof b !== 'object') return false;
  const aKeys = Object.keys(a as Record<string, unknown>);
  const bKeys = Object.keys(b as Record<string, unknown>);
  if (aKeys.length !== bKeys.length) return false;
  for (const key of aKeys) {
    if (!Object.prototype.hasOwnProperty.call(b, key)) return false;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (!Object.is((a as any)[key], (b as any)[key])) return false;
  }
  return true;
}

export function useSignalSelector<T, U>(
  sig: Signal<T>,
  select: (value: T) => U,
  isEqual: (a: U, b: U) => boolean = Object.is
): U {
  let snapshot = select(sig.value);
  return useSyncExternalStore(
    (onChange) =>
      sig.subscribe(() => {
        const next = select(sig.value);
        if (!isEqual(next, snapshot)) {
          snapshot = next;
          onChange();
        }
      }),
    () => snapshot,
    () => snapshot
  );
}

export function useSignalManySelector<U>(
  sigs: readonly Signal<unknown>[],
  select: (values: readonly unknown[]) => U,
  isEqual: (a: U, b: U) => boolean = Object.is
): U {
  let snapshot = select(sigs.map((s) => s.value));
  return useSyncExternalStore(
    (onChange) => {
      const unsubs = sigs.map((sig) =>
        sig.subscribe(() => {
          const next = select(sigs.map((s) => s.value));
          if (!isEqual(next, snapshot)) {
            snapshot = next;
            onChange();
          }
        })
      );
      return () => unsubs.forEach((un) => un());
    },
    () => snapshot,
    () => snapshot
  );
}
