import React, { useEffect, useState } from 'react';
import { retrieve } from '../api';

type RadarProps = {
  intervalMs?: number;
  includeSealed?: boolean;
};

export default function Radar({ intervalMs = 10000, includeSealed = false }: RadarProps) {
  const [last, setLast] = useState<{ ts: string; count: number } | null>(null);
  const [busy, setBusy] = useState(false);

  async function tick() {
    if (busy) return;
    try {
      setBusy(true);
      // very light query: latest 5
      const rows = await retrieve('*', 5, includeSealed);
      if (rows?.length) {
        setLast({ ts: rows[0].ts, count: rows.length });
      }
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    tick();
    const id = setInterval(tick, intervalMs);
    return () => clearInterval(id);
  }, [intervalMs, includeSealed]);

  return (
    <div
      style={{
        border: '1px solid #eee',
        borderRadius: 12,
        padding: 10,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        fontSize: 12,
      }}>
      <span>📡 Radar</span>
      <span style={{ opacity: 0.7 }}>{last ? `last: ${new Date(last.ts).toLocaleTimeString()} · ${last.count}` : '…'}</span>
      {busy && <span style={{ opacity: 0.5 }}>syncing…</span>}
    </div>
  );
}
