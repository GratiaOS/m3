import React, { useEffect, useState } from 'react';
import { LightStatus, setStatus, streamStatus } from '@/api';

type LightMeta = { label: string; bg: string; color?: string };
const MAP: Record<LightStatus, LightMeta> = {
  green: { label: '🟢 Ready', bg: '#22c55e' },
  yellow: { label: '🟡 Holding', bg: '#facc15', color: '#111' },
  red: { label: '🔴 Redirect', bg: '#ef4444' },
};

const isLightStatus = (s: unknown): s is LightStatus => s === 'green' || s === 'yellow' || s === 'red';

export default function ReadinessLightSync({ name, defaultStatus = 'green' as LightStatus }: { name: string; defaultStatus?: LightStatus }) {
  const [status, setLocal] = useState<LightStatus>(defaultStatus);

  useEffect(() => {
    const off = streamStatus((updates) => {
      updates.forEach((u) => {
        if (u.name === name && isLightStatus(u.status)) {
          setLocal(u.status);
        }
      });
    });
    return off;
  }, [name]);

  async function click(next: LightStatus) {
    setLocal(next); // optimistic UI
    await setStatus(next); // <-- color only; API is (color, note?, ttl?)
  }

  const style: React.CSSProperties = {
    background: MAP[status].bg,
    color: MAP[status].color ?? '#fff',
    borderRadius: 12,
    padding: 12,
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    boxShadow: '0 6px 20px rgba(0,0,0,.15)',
  };

  return (
    <div style={style}>
      <div style={{ width: 12, height: 12, borderRadius: 999, background: '#fff', opacity: 0.9 }} />
      <div style={{ flex: 1, fontWeight: 600 }}>
        {name}: {MAP[status].label}
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        <button onClick={() => click('green' as LightStatus)} style={{ padding: '4px 8px', borderRadius: 8, background: '#14532d', color: '#fff' }}>
          Green
        </button>
        <button onClick={() => click('yellow' as LightStatus)} style={{ padding: '4px 8px', borderRadius: 8, background: '#854d0e', color: '#fff' }}>
          Yellow
        </button>
        <button onClick={() => click('red' as LightStatus)} style={{ padding: '4px 8px', borderRadius: 8, background: '#7f1d1d', color: '#fff' }}>
          Red
        </button>
      </div>
    </div>
  );
}
