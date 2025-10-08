import { useEffect, useMemo, useState } from 'react';
import { fetchBridge } from '@/api';
import type { BridgeSuggestion, BridgeKindAlias } from '@/types/patterns';

export function useBridge(kind: BridgeKindAlias, intensity: number = 0.6) {
  const key = useMemo(() => `${String(kind)}@${Math.round(intensity * 100)}`, [kind, intensity]);
  const [data, setData] = useState<BridgeSuggestion | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const r = await fetchBridge(kind, intensity);
      setData(r);
    } catch (e) {
      setError(e as Error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return { data, loading, error, refresh } as const;
}
