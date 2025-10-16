import { useCallback, useEffect, useState } from 'react';
import type { Purpose, PurposeSignal } from '@/types/purpose';

const STORAGE_KEY = 'm3:purpose:self';

function load(): Purpose | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Purpose) : null;
  } catch {
    return null;
  }
}

function persist(purpose: Purpose) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(purpose));
  } catch {
    // Ignore storage errors (quota, private mode, etc.)
  }
}

const DEFAULT_PURPOSE: Purpose = {
  id: 'self',
  statement: '',
  principles: [],
  signal: 'dim',
  last_check_ts: new Date().toISOString(),
};

export function usePurpose() {
  const [data, setData] = useState<Purpose | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setData(load() ?? DEFAULT_PURPOSE);
    setLoading(false);
  }, []);

  const set = useCallback((patch: Partial<Purpose>) => {
    setData((prev) => {
      const next: Purpose = {
        ...(prev ?? DEFAULT_PURPOSE),
        ...patch,
        last_check_ts: new Date().toISOString(),
      };
      persist(next);
      return next;
    });
  }, []);

  const ping = useCallback(
    (signal: PurposeSignal) => {
      set({ signal });
    },
    [set],
  );

  const align = useCallback((): { next: string } => {
    const current = data ?? DEFAULT_PURPOSE;
    const statement = current.statement?.trim();
    if (!statement) {
      return { next: 'Name your purpose in one steady sentence, then pick one smallest action that proves it.' };
    }

    const firstPrinciple = current.principles[0]?.trim();
    const principleHint = firstPrinciple ? ` Honor "${firstPrinciple}".` : '';
    return {
      next: `Do one smallest action that serves “${statement}.”${principleHint}`,
    };
  }, [data]);

  return {
    data,
    loading,
    set,
    ping,
    align,
  } as const;
}
