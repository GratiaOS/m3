import React, { useEffect, useMemo, useState } from 'react';
import { getState, setState, TeamState, PillarStatus, getPanicLast, type PanicLast } from '../api';

const PILLAR_KEYS: (keyof PillarStatus)[] = ['crown', 'void', 'play', 'dragon', 'life_force'];
const COLORS: Record<PillarStatus[keyof PillarStatus], string> = { good: '#22c55e', watch: '#f59e0b', rest: '#ef4444' };

export default function Dashboard() {
  const [state, set] = useState<TeamState | null>(null);
  const [saving, setSaving] = useState(false);
  const [lastRedirect, setLastRedirect] = useState<PanicLast | null>(null);

  useEffect(() => {
    (async () => {
      const s = await getState();
      set(s);
      const last = await getPanicLast();
      setLastRedirect(last);
    })();
  }, []);

  // PanicLast type now comes from ../api:
  // export interface PanicLast {
  //   ts: string; whisper: string; breath: string; doorway: string; anchor: string; path: string;
  // }

  function timeAgo(iso: string): string {
    const then = new Date(iso).getTime();
    const sec = Math.max(1, Math.floor((Date.now() - then) / 1000));
    if (sec < 60) return `${sec}s ago`;
    const min = Math.floor(sec / 60);
    if (min < 60) return `${min}m ago`;
    const hr = Math.floor(min / 60);
    if (hr < 24) return `${hr}h ago`;
    const d = Math.floor(hr / 24);
    return `${d}d ago`;
  }

  const avg = useMemo(() => {
    if (!state) return 0;
    return Math.round(state.members.reduce((a, m) => a + m.energy, 0) / Math.max(1, state.members.length));
  }, [state]);

  const pillarScore = useMemo(() => {
    if (!state) return { good: 0, watch: 0, rest: 0 };
    const vals = PILLAR_KEYS.map((k) => state.pillars[k]);
    return {
      good: vals.filter((v) => v === 'good').length,
      watch: vals.filter((v) => v === 'watch').length,
      rest: vals.filter((v) => v === 'rest').length,
    };
  }, [state]);

  const decision = useMemo(() => {
    if (!state) return { label: '…', detail: '' };
    if (avg >= 75 && pillarScore.good >= 3 && pillarScore.rest === 0) return { label: 'GO', detail: 'Energy green and pillars stable' };
    if (avg >= 60 && pillarScore.rest <= 1) return { label: 'WAIT', detail: 'Top up life force or stabilize 1 pillar' };
    return { label: 'REST', detail: 'Recover energy + fix red pillars before launching' };
  }, [avg, pillarScore, state]);

  function mutateMember(i: number, energy: number) {
    if (!state) return;
    const members = [...state.members];
    members[i] = { ...members[i], energy };
    set({ ...state, members });
  }
  function mutatePillar(k: keyof PillarStatus, v: PillarStatus[keyof PillarStatus]) {
    if (!state) return;
    set({ ...state, pillars: { ...state.pillars, [k]: v } });
  }

  async function save() {
    if (!state) return;
    setSaving(true);
    const next = await setState({ members: state.members, pillars: state.pillars, note: state.note });
    set(next);
    setSaving(false);
  }

  if (!state) return <div style={{ padding: 12, border: '1px solid #eee', borderRadius: 12 }}>Loading dashboard…</div>;

  const SmallPill: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <span
      style={{
        fontSize: 12,
        padding: '2px 8px',
        borderRadius: 999,
        background: '#eef2ff',
        color: '#3730a3',
      }}>
      {children}
    </span>
  );

  return (
    <div style={{ border: '1px solid #e5e7eb', borderRadius: 16, padding: 16, display: 'grid', gap: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <h2 style={{ margin: 0 }}>Team Energy & Pillars</h2>
        <small style={{ opacity: 0.6 }}>last update · {new Date(state.ts).toLocaleString()}</small>
      </div>
      {lastRedirect && (
        <div>
          <SmallPill>
            Last redirect: {lastRedirect.whisper || '—'} → {lastRedirect.doorway || '—'} ({timeAgo(lastRedirect.ts)})
          </SmallPill>
        </div>
      )}

      {/* Decision badge */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <span
          style={{
            fontWeight: 700,
            padding: '6px 10px',
            borderRadius: 999,
            background: decision.label === 'GO' ? '#dcfce7' : decision.label === 'WAIT' ? '#fef9c3' : '#fee2e2',
            color: decision.label === 'GO' ? '#166534' : decision.label === 'WAIT' ? '#854d0e' : '#991b1b',
          }}>
          {decision.label}
        </span>
        <span style={{ opacity: 0.8 }}>
          {decision.detail} · AVG {avg}% · pillars G/W/R {pillarScore.good}/{pillarScore.watch}/{pillarScore.rest}
        </span>
      </div>

      {/* Members */}
      <div style={{ display: 'grid', gap: 8 }}>
        {state.members.map((m, i) => (
          <div key={m.name} style={{ display: 'grid', gridTemplateColumns: '120px 1fr 48px', alignItems: 'center', gap: 8 }}>
            <div style={{ fontWeight: 600 }}>{m.name}</div>
            <input type="range" min={0} max={100} value={m.energy} onChange={(e) => mutateMember(i, parseInt(e.target.value))} />
            <div style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{m.energy}%</div>
          </div>
        ))}
      </div>

      {/* Pillars */}
      <div style={{ display: 'grid', gap: 8 }}>
        {PILLAR_KEYS.map((k) => (
          <div key={k} style={{ display: 'grid', gridTemplateColumns: '140px auto', alignItems: 'center', gap: 8 }}>
            <div style={{ textTransform: 'capitalize' }}>{k.replace('_', ' ')}</div>
            <div style={{ display: 'flex', gap: 8 }}>
              {(['good', 'watch', 'rest'] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => mutatePillar(k, v)}
                  style={{
                    padding: '4px 10px',
                    borderRadius: 999,
                    border: '1px solid #e5e7eb',
                    background: state.pillars[k] === v ? COLORS[v] : '#fff',
                    color: state.pillars[k] === v ? '#fff' : '#374151',
                  }}>
                  {v}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Note + Save */}
      <div style={{ display: 'grid', gap: 8 }}>
        <textarea
          value={state.note || ''}
          onChange={(e) => set({ ...state, note: e.target.value })}
          placeholder="Notes for context (e.g., why we chose WAIT)"></textarea>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={save} disabled={saving}>
            {saving ? 'Saving…' : 'Save state'}
          </button>
          <button onClick={async () => set(await getState())}>Reload</button>
        </div>
      </div>
    </div>
  );
}
