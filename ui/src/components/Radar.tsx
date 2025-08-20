import React, { useEffect, useState } from 'react';
import { retrieve } from '../api';

type RadarProps = {
  intervalMs?: number;
  includeSealed?: boolean;
};

// minimal shape we read from rows
type Row = { ts: string };

export default function Radar({ intervalMs = 10000, includeSealed = false }: RadarProps) {
  const [last, setLast] = useState<{ ts: string; count: number } | null>(null);
  const [busy, setBusy] = useState(false);

  async function tick() {
    if (busy) return;
    setBusy(true);
    try {
      const rows: unknown = await retrieve('*', 5, includeSealed);
      if (Array.isArray(rows) && rows.length) {
        const r0 = rows[0] as Row;
        if (r0?.ts) setLast({ ts: r0.ts, count: rows.length });
      }
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    let active = true;
    async function tick() {
      if (!active) return;
      if (busy) return;
      setBusy(true);
      try {
        const rows: unknown = await retrieve('*', 5, includeSealed);
        if (Array.isArray(rows) && rows.length) {
          const r0 = rows[0] as Row;
          if (r0?.ts) setLast({ ts: r0.ts, count: rows.length });
        }
      } finally {
        setBusy(false);
      }
    }

    tick();
    const id = setInterval(tick, intervalMs);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, [intervalMs, includeSealed, busy]);

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
