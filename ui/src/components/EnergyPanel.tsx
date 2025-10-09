import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ENERGY_LABEL, MICRO_PLAYS, Energy, suggestNext } from '@/energy';
import { ingest } from '@/api';

type RetrievedChunk = {
  id: number;
  text: string;
  tags: string[];
  profile: string;
  ts: string; // RFC3339 from server
  score: number;
};

type Props = {
  chunks: RetrievedChunk[];
  onLogged?: () => void;
};

const ENERGY_VALUES: Energy[] = ['crown', 'play', 'life', 'dragon', 'void'];

export default function EnergyPanel({ onLogged, chunks }: Props) {
  const [history, setHistory] = useState<Energy[]>([]);
  const [note, setNote] = useState('');
  const primed = useRef(false);

  // derive recent energy markers from chunks, newest last
  const recentEnergies = useMemo<Energy[]>(() => {
    const out: Energy[] = [];
    for (const c of chunks) {
      // look for tag like "energy:play"
      const t = c.tags.find((t) => t.startsWith('energy:'));
      if (!t) continue;
      const val = t.split(':')[1] as Energy | undefined;
      if (val && ENERGY_VALUES.includes(val)) out.push(val);
    }
    // keep the last 10 to avoid runaway history
    return out.slice(-10);
  }, [chunks]);

  // prime history once from existing data (don’t fight user’s live session)
  useEffect(() => {
    if (!primed.current && recentEnergies.length) {
      setHistory(recentEnergies);
      primed.current = true;
    }
  }, [recentEnergies]);

  const tip = useMemo(() => suggestNext(history), [history]);

  async function logEnergy(e: Energy) {
    const label = ENERGY_LABEL[e];
    const text = `[energy] ${label}${note ? ` — ${note}` : ''}`;
    const tags = ['energy', `energy:${e}`];

    await ingest({ text, tags, profile: 'Raz', privacy: 'public', importance: 1 });
    setHistory((h) => [...h, e]);
    setNote('');
    onLogged?.();
  }

  function reset() {
    setHistory([]);
    setNote('');
    primed.current = true; // prevent re-priming from chunks after manual reset
  }

  return (
    <div style={{ border: '1px solid #ddd', borderRadius: 12, padding: 12, display: 'grid', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <strong>Energy Coach</strong>
        <button onClick={reset} style={{ fontSize: 12, opacity: 0.7 }}>
          reset
        </button>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {ENERGY_VALUES.map((e) => (
          <button
            key={e}
            onClick={() => logEnergy(e)}
            title={ENERGY_LABEL[e]}
            style={{
              padding: '6px 10px',
              borderRadius: 999,
              border: '1px solid #ccc',
              cursor: 'pointer',
              background: '#fff',
            }}
            aria-label={`log ${ENERGY_LABEL[e]} energy`}>
            {ENERGY_LABEL[e]}
          </button>
        ))}
      </div>

      <input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="(optional) 1‑line note"
        style={{ padding: '6px 8px', border: '1px solid #ddd', borderRadius: 8 }}
      />

      <div style={{ background: '#fafafa', border: '1px solid #eee', borderRadius: 10, padding: 10 }}>
        <div style={{ fontSize: 12, opacity: 0.8 }}>Next move</div>
        <div style={{ fontWeight: 600, margin: '4px 0' }}>{tip.title}</div>
        <ul style={{ margin: '6px 0 0 18px' }}>
          {tip.steps.map((s, i) => (
            <li key={i} style={{ marginBottom: 4 }}>
              {s}
            </li>
          ))}
        </ul>
        {tip.shortcut && <div style={{ fontSize: 12, opacity: 0.8, marginTop: 6 }}>Shortcut: {tip.shortcut}</div>}
      </div>

      <div style={{ fontSize: 12, opacity: 0.8 }}>
        Micro‑plays:&nbsp;
        {MICRO_PLAYS.map((m, i) => (
          <span key={i} style={{ marginRight: 8 }}>
            • {m}
          </span>
        ))}
      </div>
    </div>
  );
}
