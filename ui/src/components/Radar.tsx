import React, { useEffect, useRef, useState } from 'react';
import { retrieve } from '../api';

type RadarProps = {
  intervalMs?: number;
  includeSealed?: boolean;
};

// minimal shape we read from rows
type Row = { ts: string };

function mapSignal(count: number): { label: string; color: string } {
  if (count === 0) return { label: 'silent field', color: '#7c7c7c' }; // grey
  if (count <= 3) return { label: 'calm pulse', color: '#16a34a' }; // green-600
  if (count <= 7) return { label: 'dense chatter', color: '#f59e0b' }; // amber-500
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

export default function Radar({ intervalMs = 10000, includeSealed = false }: RadarProps) {
  const [last, setLast] = useState<{ ts: string; count: number } | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [ago, setAgo] = useState<string>('—');

  const busyRef = useRef(false);
  const [pollMs, setPollMs] = useState(intervalMs);

  async function tick() {
    if (busyRef.current) return;
    busyRef.current = true;
    setIsSyncing(true);
    try {
      const rows: unknown = await retrieve('*', 5, includeSealed);
      if (Array.isArray(rows) && rows.length) {
        const r0 = rows[0] as Row;
        if (r0?.ts) {
          setLast({ ts: r0.ts, count: rows.length });
          setPollMs(intervalMs); // got data → reset backoff
        }
      } else {
        // nothing new → backoff up to 60s
        setPollMs((ms) => Math.min(ms * 2, 60000));
      }
    } finally {
      setIsSyncing(false);
      busyRef.current = false;
    }
  }

  // polling loop with backoff
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
  }, [pollMs, includeSealed]);

  // live “time since last”
  useEffect(() => {
    // update every second
    const id = setInterval(() => {
      setAgo(formatAgo(last?.ts));
    }, 1000);
    // set immediately so it doesn’t wait a second after new data
    setAgo(formatAgo(last?.ts));
    return () => clearInterval(id);
  }, [last?.ts]);

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
      {last ? (
        <>
          <span style={{ opacity: 0.7 }}>{`last: ${new Date(last.ts).toLocaleTimeString()} · `}</span>
          {(() => {
            const sig = mapSignal(last.count);
            const tip = `based on last ${last.count} note${last.count === 1 ? '' : 's'}` + (includeSealed ? ' (incl. sealed)' : '');
            return (
              <span aria-label={`signal ${sig.label}`} title={tip} style={{ color: sig.color, fontWeight: 600, cursor: 'help' }}>
                {sig.label}
              </span>
            );
          })()}
        </>
      ) : (
        <span style={{ opacity: 0.7 }}>…</span>
      )}
      <span style={{ opacity: 0.6 }}>· {ago}</span>
      {isSyncing && <span style={{ opacity: 0.5 }}>syncing…</span>}
    </div>
  );
}
