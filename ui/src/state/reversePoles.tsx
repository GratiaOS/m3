import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

type ReversePolesContextValue = {
  enabled: boolean;
  setEnabled: (value: boolean) => void;
  toggleEnabled: () => void;
  units: readonly boolean[];
  setUnit: (index: number, value: boolean) => void;
  resetUnits: () => void;
  remaining: number;
};

const STORAGE_KEY = 'm3:reverse-poles';

type StoredState = {
  enabled: boolean;
  units: boolean[];
  date: string;
};

const defaultUnits = (): boolean[] => [false, false, false];

const todayKey = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

function readStorage(): StoredState {
  if (typeof window === 'undefined') {
    return { enabled: false, units: defaultUnits(), date: todayKey() };
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) throw new Error('missing');
    const parsed = JSON.parse(raw) as Partial<StoredState>;
    if (!parsed || typeof parsed !== 'object') throw new Error('bad');
    const date = parsed.date === todayKey() ? parsed.date : todayKey();
    const units = Array.isArray(parsed.units) ? (parsed.units.slice(0, 3) as boolean[]) : defaultUnits();
    while (units.length < 3) units.push(false);
    if (parsed.date !== date) {
      return { enabled: Boolean(parsed.enabled), units: defaultUnits(), date };
    }
    return { enabled: Boolean(parsed.enabled), units, date };
  } catch {
    return { enabled: false, units: defaultUnits(), date: todayKey() };
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
  const [enabled, setEnabledState] = useState(false);
  const [units, setUnits] = useState<boolean[]>(defaultUnits);

  useEffect(() => {
    const stored = readStorage();
    setEnabledState(stored.enabled);
    setUnits(stored.units);
  }, []);

  useEffect(() => {
    writeStorage({ enabled, units, date: todayKey() });
  }, [enabled, units]);

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

  const remaining = useMemo(() => units.filter((x) => !x).length, [units]);

  const value = useMemo<ReversePolesContextValue>(
    () => ({
      enabled,
      setEnabled,
      toggleEnabled,
      units,
      setUnit,
      resetUnits,
      remaining,
    }),
    [enabled, remaining, resetUnits, setEnabled, setUnit, toggleEnabled, units],
  );

  return <ReversePolesContext.Provider value={value}>{children}</ReversePolesContext.Provider>;
}

export function useReversePoles() {
  const ctx = useContext(ReversePolesContext);
  if (!ctx) throw new Error('useReversePoles must be used within ReversePolesProvider');
  return ctx;
}
