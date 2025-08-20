import React, { useEffect, useState } from 'react';
import type { JoyMessage } from '../utils/joy';

type ToastMessage = JoyMessage & { id: string };

function isJoyEvent(e: Event): e is CustomEvent<JoyMessage> {
  return 'detail' in e;
}

export default function Toaster() {
  const [items, setItems] = useState<ToastMessage[]>([]);

  useEffect(() => {
    const onToast = (e: Event) => {
      if (!isJoyEvent(e)) return;
      const detail = e.detail;
      const id = crypto.randomUUID();
      const withId: ToastMessage = { ...detail, id };
      setItems((prev) => [...prev, withId]);

      const ttl = detail.ttl ?? 3500;
      setTimeout(() => {
        setItems((prev) => prev.filter((t) => t.id !== id));
      }, ttl);
    };

    window.addEventListener('joy:toast', onToast as EventListener);
    return () => window.removeEventListener('joy:toast', onToast as EventListener);
  }, []);

  return (
    <div
      style={{
        position: 'fixed',
        right: 16,
        bottom: 16,
        display: 'grid',
        gap: 8,
        zIndex: 9999,
      }}>
      {items.map((t) => (
        <div
          key={t.id}
          style={{
            maxWidth: 360,
            background: palette[t.level].bg,
            color: palette[t.level].fg,
            border: `1px solid ${palette[t.level].border}`,
            borderRadius: 12,
            boxShadow: '0 10px 25px rgba(0,0,0,0.08), 0 2px 6px rgba(0,0,0,0.06)',
            padding: '10px 12px',
            display: 'grid',
            gap: 4,
            fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
          }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ fontSize: 18 }}>{t.icon}</span>
            <div style={{ fontWeight: 600, fontSize: 14 }}>{t.title}</div>
          </div>
          {t.body && <div style={{ opacity: 0.8, fontSize: 12, lineHeight: 1.3 }}>{t.body}</div>}
        </div>
      ))}
    </div>
  );
}

const palette = {
  info: { bg: '#f7fbff', fg: '#0b3a5b', border: '#d6e9ff' },
  success: { bg: '#f6fff8', fg: '#0f5132', border: '#b7f0c4' },
  warning: { bg: '#fffdf5', fg: '#7a5b00', border: '#ffe7a3' },
  error: { bg: '#fff6f6', fg: '#7a0b0b', border: '#ffc5c5' },
} as const;
