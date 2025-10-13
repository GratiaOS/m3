import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

// Local date key (YYYY-MM-DD) using local time
function localDateKey(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const da = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${da}`;
}

// Milliseconds until the next local midnight
function msUntilNextLocalMidnight(): number {
  const now = new Date();
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0);
  return next.getTime() - now.getTime();
}

type ReversePolesContextValue = {
  enabled: boolean;
  setEnabled: (value: boolean) => void;
  toggleEnabled: () => void;
  units: readonly boolean[];
  setUnit: (index: number, value: boolean) => void;
  setUnitsDirect: (next: boolean[]) => void;
  resetUnits: () => void;
  remaining: number;
};

const STORAGE_KEY = 'm3:reverse-poles';

type StoredState = {
  enabled: boolean;
  units: boolean[];
  date: string;
  previousDate?: string | null;
};

const defaultUnits = (): boolean[] => [false, false, false];

function readStorage(): StoredState {
  if (typeof window === 'undefined') {
    return { enabled: false, units: defaultUnits(), date: localDateKey() };
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) throw new Error('missing');
    const parsed = JSON.parse(raw) as Partial<StoredState>;
    if (!parsed || typeof parsed !== 'object') throw new Error('bad');
    const originalDate = typeof parsed.date === 'string' ? parsed.date : null;
    const date = originalDate === localDateKey() ? originalDate : localDateKey();
    const units = Array.isArray(parsed.units) ? (parsed.units.slice(0, 3) as boolean[]) : defaultUnits();
    while (units.length < 3) units.push(false);
    if (parsed.date !== date) {
      return { enabled: Boolean(parsed.enabled), units: defaultUnits(), date, previousDate: originalDate };
    }
    return { enabled: Boolean(parsed.enabled), units, date, previousDate: originalDate };
  } catch {
    return { enabled: false, units: defaultUnits(), date: localDateKey(), previousDate: null };
  }
}

function writeStorage(state: StoredState) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore storage errors (private mode / quota)
  }
}

const ReversePolesContext = createContext<ReversePolesContextValue | undefined>(undefined);

export function ReversePolesProvider({ children }: { children: React.ReactNode }) {
  const [initial] = useState<StoredState>(() => readStorage());
  const [enabled, setEnabledState] = useState(initial.enabled);
  const [units, setUnits] = useState<boolean[]>(initial.units);
  const initialRef = useRef(initial);

  useEffect(() => {
    writeStorage({ enabled, units, date: localDateKey() });
  }, [enabled, units]);

  useEffect(() => {
    const { previousDate, date } = initialRef.current;
    if (previousDate && previousDate !== date) {
      try {
        window.dispatchEvent(
          new CustomEvent('rtp:reset', {
            detail: { reason: 'cold-start', date },
          })
        );
      } catch {
        // no-op
      }
    }
  }, []);

  const setEnabled = useCallback((value: boolean) => {
    setEnabledState(value);
  }, []);

  const toggleEnabled = useCallback(() => {
    setEnabledState((prev) => !prev);
  }, []);

  const setUnit = useCallback((index: number, value: boolean) => {
    setUnits((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  }, []);

  const resetUnits = useCallback(() => {
    setUnits(defaultUnits());
  }, []);

  const setUnitsDirect = useCallback((next: boolean[]) => {
    setUnits(() => {
      const arr = next.slice(0, 3);
      while (arr.length < 3) arr.push(false);
      return arr;
    });
  }, []);

  const remaining = useMemo(() => units.filter((x) => !x).length, [units]);

  const value = useMemo<ReversePolesContextValue>(
    () => ({
      enabled,
      setEnabled,
      toggleEnabled,
      units,
      setUnit,
      setUnitsDirect,
      resetUnits,
      remaining,
    }),
    [enabled, remaining, resetUnits, setEnabled, setUnit, setUnitsDirect, toggleEnabled, units]
  );

  return <ReversePolesContext.Provider value={value}>{children}</ReversePolesContext.Provider>;
}

export function useReversePoles() {
  const ctx = useContext(ReversePolesContext);
  if (!ctx) throw new Error('useReversePoles must be used within ReversePolesProvider');

  const { enabled, setUnitsDirect } = ctx;

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const el = document.documentElement;
    if (enabled) el.dataset.mode = 'rtp';
    else delete el.dataset.mode;
  }, [enabled]);

  useEffect(() => {
    let timer: number | null = null;

    function schedule() {
      const ms = msUntilNextLocalMidnight();
      timer = window.setTimeout(() => {
        setUnitsDirect(defaultUnits());
        try {
          window.dispatchEvent(
            new CustomEvent('rtp:reset', {
              detail: { reason: 'midnight', date: localDateKey() },
            })
          );
        } catch {
          // ignore dispatch errors
        }
        schedule();
      }, ms);
    }

    schedule();
    return () => {
      if (timer !== null) window.clearTimeout(timer);
    };
  }, [setUnitsDirect]);

  return ctx;
}
