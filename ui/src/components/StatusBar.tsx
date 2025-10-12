import React, { useEffect, useState } from 'react';
import { getStatus, setStatus } from '@/api';
import { useReversePoles } from '@/state/reversePoles';

type Color = 'green' | 'yellow' | 'red';

export default function StatusBar() {
  const [color, setColor] = useState<Color>('green');
  const [note, setNote] = useState('');
  const [ttl, setTtl] = useState<number | ''>('');
  const [expiresAt, setExpiresAt] = useState<string | undefined>(undefined);
  const { enabled: rtpEnabled, toggleEnabled, units, setUnit, resetUnits, remaining } = useReversePoles();

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
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 12 }}>
        <button
          type="button"
          onClick={toggleEnabled}
          style={{
            padding: '6px 12px',
            borderRadius: 999,
            border: '1px solid #d4d4d8',
            background: rtpEnabled ? '#e0f2fe' : '#f4f4f5',
            fontWeight: 600,
          }}>
          RTP {rtpEnabled ? 'ON' : 'OFF'}
        </button>
        <div style={{ display: 'flex', gap: 6 }}>
          {units.map((used, index) => (
            <button
              key={index}
              aria-label={`capacity unit ${index + 1} ${used ? 'spent' : 'available'}`}
              onClick={() => rtpEnabled && setUnit(index, !used)}
              style={{
                width: 14,
                height: 14,
                borderRadius: '50%',
                border: '1px solid #d4d4d8',
                background: used ? '#34d399' : '#f4f4f5',
                opacity: rtpEnabled ? 1 : 0.4,
                cursor: rtpEnabled ? 'pointer' : 'not-allowed',
              }}
            />
          ))}
        </div>
        <button
          type="button"
          onClick={resetUnits}
          disabled={!rtpEnabled}
          style={{
            padding: '4px 8px',
            borderRadius: 8,
            border: '1px solid #e2e2e8',
            background: '#fafafa',
            fontSize: 12,
            opacity: rtpEnabled ? 1 : 0.5,
            cursor: rtpEnabled ? 'pointer' : 'not-allowed',
          }}>
          reset
        </button>
        {rtpEnabled && remaining === 0 && <span style={{ fontSize: 12, color: '#0f766e' }}>Rest is repair.</span>}
      </div>
    </div>
  );
}
