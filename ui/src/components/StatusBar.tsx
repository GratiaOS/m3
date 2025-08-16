import React, { useEffect, useState } from 'react';
import { getStatus, setStatus } from '../api';

type Color = 'green' | 'yellow' | 'red';

export default function StatusBar() {
  const [color, setColor] = useState<Color>('green');
  const [note, setNote] = useState('');
  const [ttl, setTtl] = useState<number | ''>('');
  const [expiresAt, setExpiresAt] = useState<string | undefined>(undefined);

  async function refresh() {
    const s = await getStatus();
    setColor(s.color);
    setNote(s.note || '');
    setExpiresAt(s.expires_at ? new Date(s.expires_at).toLocaleTimeString() : undefined);
  }

  async function apply(c: Color) {
    await setStatus(c, note || undefined, ttl === '' ? undefined : Number(ttl));
    await refresh();
  }

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 15_000); // keep it fresh
    return () => clearInterval(id);
  }, []);

  const chip = (c: Color, label: string) => (
    <button
      key={c}
      onClick={() => apply(c)}
      style={{
        padding: '6px 10px',
        borderRadius: 14,
        border: '1px solid #ddd',
        background: color === c ? (c === 'green' ? '#d9fdd3' : c === 'yellow' ? '#fff4ce' : '#ffdce0') : '#f7f7f7',
        color: '#222',
        cursor: 'pointer',
      }}
      title={`Set ${c}`}>
      {label}
    </button>
  );

  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
      <strong>Status:</strong>
      {chip('green', 'Green')}
      {chip('yellow', 'Yellow')}
      {chip('red', 'Red')}
      <input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="note (optional)"
        style={{ padding: 6, border: '1px solid #ddd', borderRadius: 8, minWidth: 220 }}
      />
      <input
        value={ttl}
        onChange={(e) => setTtl(e.target.value === '' ? '' : Number(e.target.value))}
        placeholder="TTL min"
        style={{ width: 90, padding: 6, border: '1px solid #ddd', borderRadius: 8 }}
      />
      <button onClick={() => apply(color)} style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #ddd', background: '#efefef' }}>
        Save
      </button>
      <span style={{ fontSize: 12, opacity: 0.7 }}>{expiresAt ? `auto-resets at ${expiresAt}` : 'no auto-reset'}</span>
    </div>
  );
}
