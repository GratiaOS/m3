import React, { useEffect, useRef, useState } from 'react';
import { retrieve } from '../api';

type RadarProps = {
  intervalMs?: number;
  includeSealed?: boolean;
  /** optional: pass current search query so signal reflects it */
  query?: string;
};

// minimal shape we read from rows
type Row = { ts: string };

function mapSignal(count: number): { label: string; color: string } {
  if (count === 0) return { label: 'silent field', color: '#7c7c7c' }; // grey
  if (count <= 10) return { label: 'calm pulse', color: '#16a34a' }; // green-600
  if (count <= 40) return { label: 'dense chatter', color: '#f59e0b' }; // amber-500
  return { label: 'stormy', color: '#dc2626' }; // red-600
}

function formatAgo(tsISO?: string): string {
  if (!tsISO) return '—';
  const now = Date.now();
  const then = new Date(tsISO).getTime();
  const diff = Math.max(0, Math.floor((now - then) / 1000)); // seconds
  const h = Math.floor(diff / 3600);
  const m = Math.floor((diff % 3600) / 60);
  const s = diff % 60;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export default function Radar({ intervalMs = 10000, includeSealed = false, query }: RadarProps) {
  const [last, setLast] = useState<{ ts: string; count: number } | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  const busyRef = useRef(false);
  const [pollMs, setPollMs] = useState(intervalMs);

  const tick = React.useCallback(async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    setIsSyncing(true);
    try {
      // API expects an object and returns { chunks: [...] } — fetch a larger window so count is meaningful
      const q = query && query.trim().length > 0 ? query.trim() : '*';
      const MAX = 500;
      const res = await retrieve({ query: q, limit: MAX, include_sealed: includeSealed });
      const rows = Array.isArray(res?.chunks) ? (res.chunks as Row[]) : [];
      if (rows.length > 0 && rows[0]?.ts) {
        setLast({ ts: rows[0].ts, count: rows.length });
        setPollMs(intervalMs); // got data → reset backoff
      } else {
        // nothing new → backoff up to 60s
        setPollMs((ms) => Math.min(ms * 2, 60000));
      }
    } finally {
      setIsSyncing(false);
      busyRef.current = false;
    }
  }, [includeSealed, intervalMs, query]);

  useEffect(() => {
    let active = true;
    tick(); // run once immediately
    const id = setInterval(() => {
      if (active) tick();
    }, pollMs);

    return () => {
      active = false;
      clearInterval(id);
    };
  }, [pollMs, tick]);

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
      }}
      title="Signal = number of notes matching the current query (windowed sample, not total DB).">
      <span>📡 Signal</span>
      <span style={{ fontWeight: 600, marginLeft: 6 }}>
        {last
          ? (() => {
              const sig = mapSignal(last.count);
              const tip = `matches: ${last.count}` + (includeSealed ? ' (incl. sealed)' : '');
              return (
                <span aria-label={`signal ${sig.label}`} title={tip} style={{ color: sig.color, fontWeight: 600, cursor: 'help' }}>
                  {sig.label} · {last.count}
                </span>
              );
            })()
          : '—'}
      </span>
      <span style={{ opacity: 0.6, marginLeft: 8 }}>· {last ? new Date(last.ts).toLocaleTimeString() : '—'}</span>
      {isSyncing && <span style={{ opacity: 0.5 }}>syncing…</span>}
    </div>
  );
}
