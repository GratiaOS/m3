import { createSignal } from '@gratiaos/presence-kernel';

export type PadTrace = {
  padId: string;
  y: number;
  ts: number;
  release?: boolean;
};

export const lastTrace$ = createSignal<PadTrace | null>(null);

export const setPadTrace = (trace: PadTrace) => {
  lastTrace$.set(trace);
};

export const releasePadTrace = (padId: string | null) => {
  if (!padId) return;
  const current = lastTrace$.value;
  if (current?.padId !== padId) return;
  if (current.release) return;
  lastTrace$.set({ ...current, release: true });
};

export const clearPadTrace = () => {
  lastTrace$.set(null);
};
