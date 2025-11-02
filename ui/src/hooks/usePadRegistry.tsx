import { createContext, useCallback, useContext, useMemo, useState } from 'react';

export type PadInstance = {
  id: string;
  title: string;
  scene: string;
  setScene: (scene: string) => void;
  signal?: unknown;
};

type PadRegistryValue = {
  pads: ReadonlyArray<PadInstance>;
  register: (pad: PadInstance) => void;
  unregister: (id: string) => void;
};

const PadRegistryContext = createContext<PadRegistryValue>({
  pads: [],
  register: () => {},
  unregister: () => {},
});

export function PadRegistryProvider({ children }: { children: React.ReactNode }) {
  const [pads, setPads] = useState<PadInstance[]>([]);

  const register = useCallback((pad: PadInstance) => {
    setPads((current) => {
      const next = current.filter((item) => item.id !== pad.id);
      next.push(pad);
      return next;
    });
  }, []);

  const unregister = useCallback((id: string) => {
    setPads((current) => current.filter((item) => item.id !== id));
  }, []);

  const value = useMemo<PadRegistryValue>(
    () => ({
      pads,
      register,
      unregister,
    }),
    [pads, register, unregister]
  );

  return <PadRegistryContext.Provider value={value}>{children}</PadRegistryContext.Provider>;
}

export function usePadRegistry() {
  return useContext(PadRegistryContext);
}
