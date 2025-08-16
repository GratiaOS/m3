import React, { useEffect, useMemo, useState } from 'react';
import { ingest } from '../api';

/**
 * Local queue item saved in localStorage
 */
type QueuedMsg = {
  id: string;
  to: string; // e.g. "sister.exe"
  text: string;
  lang: 'ro' | 'es';
  tone: 'firm' | 'warm' | 'gentle';
  scheduledAt: number; // epoch ms
  createdAt: number; // epoch ms
  moodAtSchedule: number; // 1..5
};

const STORAGE_KEY = 'boundaryQueue.v1';

/** Templates Vault (short, boundary-only, pre-agreed) */
const VAULT: Record<'ro' | 'es', Record<'firm' | 'warm' | 'gentle', string>> = {
  ro: {
    firm: 'Momentan nu e potrivit să ne vedem. Te rog fără presiune pe tema vizitei. Revin eu când e momentul.',
    warm: 'Acum am nevoie de liniște și spațiu. Te anunț eu când e potrivit.',
    gentle: 'Mulțumesc că întrebi. Deocamdată am nevoie de calm. Revin eu când pot.',
  },
  es: {
    firm: 'Ahora no puedo recibir visitas. Por favor, sin presión. Te avisaré cuando sea el momento.',
    warm: 'Necesito calma y espacio por ahora. Te aviso cuando sea posible.',
    gentle: 'Gracias por preguntar. De momento necesito tranquilidad. Te escribiré yo cuando pueda.',
  },
};

function loadQueue(): QueuedMsg[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}
function saveQueue(q: QueuedMsg[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(q));
}

function inHours(h: number) {
  return Date.now() + h * 60 * 60 * 1000;
}

export default function BoundaryComposer({ to = 'sister.exe' }: { to?: string }) {
  const [lang, setLang] = useState<'ro' | 'es'>('ro');
  const [tone, setTone] = useState<'firm' | 'warm' | 'gentle'>('firm');
  const [mood, setMood] = useState<number>(3); // 1..5
  const [text, setText] = useState<string>('');
  const [queue, setQueue] = useState<QueuedMsg[]>(loadQueue());
  const [delayHours, setDelayHours] = useState<number>(4); // default auto-queue +4h

  // keep template text synced unless user edits
  const template = useMemo(() => VAULT[lang][tone], [lang, tone]);
  useEffect(() => {
    setText(template);
  }, [template]);

  // tick for countdown re-render
  const [, forceTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => forceTick((v) => v + 1), 1000);
    return () => clearInterval(t);
  }, []);

  // fire scheduler: when time arrives, we prompt Sawsan to send (copy)
  useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now();
      const due = queue.filter((q) => q.scheduledAt <= now);
      if (due.length) {
        due.forEach(async (item) => {
          // Log to memory that a queued boundary is ready (not auto-sending messages)
          await ingest({
            text: `[READY-TO-SEND boundary → ${item.to}] ${item.text}`,
            tags: ['boundary', 'queue', 'ready'],
            profile: 'Raz',
            privacy: 'private',
            importance: 1,
          });
          // Surface a polite toast via alert (MVP); you can replace with a UI toast
          alert(`Boundary ready to send to ${item.to}:\n\n${item.text}\n\nCopied to clipboard.`);
          try {
            await navigator.clipboard.writeText(item.text);
          } catch {}
        });
        const remaining = queue.filter((q) => q.scheduledAt > now);
        setQueue(remaining);
        saveQueue(remaining);
      }
    }, 30000); // scan every 30s
    return () => clearInterval(timer);
  }, [queue]);

  async function log(action: string, extra: Record<string, any> = {}) {
    await ingest({
      text: `[boundary ${action}] to=${to} mood=${mood} lang=${lang} tone=${tone} :: ${text}`,
      tags: ['boundary', action, tone, lang, `mood-${mood}`],
      profile: 'Raz',
      privacy: 'private',
      importance: 1,
      ...extra,
    });
  }

  function scheduleSend() {
    const item: QueuedMsg = {
      id: crypto.randomUUID(),
      to,
      text,
      lang,
      tone,
      scheduledAt: inHours(delayHours),
      createdAt: Date.now(),
      moodAtSchedule: mood,
    };
    const next = [...queue, item].sort((a, b) => a.scheduledAt - b.scheduledAt);
    setQueue(next);
    saveQueue(next);
    void log('queued', { scheduledAt: new Date(item.scheduledAt).toISOString() });
    alert(`Queued for ${new Date(item.scheduledAt).toLocaleString()}`);
  }

  async function sendNow() {
    // We never auto-contact sister.exe. We only copy to clipboard and guide WhatsApp.
    await log('approved_send_now');
    try {
      await navigator.clipboard.writeText(text);
    } catch {}
    alert('Message copied. Paste in WhatsApp to send.');
    // Optional deep link (commented; enable if you want):
    // window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  }

  function cancel(id: string) {
    const next = queue.filter((q) => q.id !== id);
    setQueue(next);
    saveQueue(next);
    void log('cancel_queued', { id });
  }

  function delay(id: string, hours: number) {
    const next = queue
      .map((q) => (q.id === id ? { ...q, scheduledAt: q.scheduledAt + hours * 3600_000 } : q))
      .sort((a, b) => a.scheduledAt - b.scheduledAt);
    setQueue(next);
    saveQueue(next);
    void log('delay_queued', { id, hours });
  }

  function countdown(ms: number) {
    const d = Math.max(0, ms - Date.now());
    const hh = Math.floor(d / 3600_000);
    const mm = Math.floor((d % 3600_000) / 60_000);
    const ss = Math.floor((d % 60_000) / 1000);
    return `${hh}h ${mm}m ${ss}s`;
  }

  const moodAdvice =
    mood <= 2 ? 'Mood low — auto-queue recommended.' : mood === 3 ? 'Neutral — you can send or queue.' : 'Mood stable — safe to send now.';

  return (
    <div style={{ border: '1px solid #eee', borderRadius: 12, padding: 16, display: 'grid', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <h3 style={{ margin: 0 }}>Boundary Composer</h3>
        <div style={{ fontSize: 12, opacity: 0.7 }}>
          to: <b>{to}</b>
        </div>
      </div>

      {/* Mood slider */}
      <div style={{ display: 'grid', gap: 6 }}>
        <label style={{ fontSize: 12, opacity: 0.75 }}>Mood (1 = low, 5 = strong)</label>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <input type="range" min={1} max={5} value={mood} onChange={(e) => setMood(Number(e.target.value))} />
          <div style={{ fontSize: 12, opacity: 0.8 }}>
            {mood} · {moodAdvice}
          </div>
        </div>
      </div>

      {/* Language / Tone */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <select value={lang} onChange={(e) => setLang(e.target.value as any)}>
          <option value="ro">RO</option>
          <option value="es">ES</option>
        </select>
        <select value={tone} onChange={(e) => setTone(e.target.value as any)}>
          <option value="firm">firm</option>
          <option value="warm">warm</option>
          <option value="gentle">gentle</option>
        </select>
        <button onClick={() => setText(template)}>Reset to template</button>
      </div>

      {/* Message editor (short) */}
      <textarea
        rows={3}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Short boundary only. No empathy payload here."
        style={{ width: '100%' }}
      />

      {/* Actions */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button onClick={sendNow} disabled={mood <= 2} title={mood <= 2 ? 'Mood low — better to queue' : 'Copy & go send in WhatsApp'}>
          Send now (copy)
        </button>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: 12, opacity: 0.75 }}>Queue +</span>
          <input type="number" min={1} max={48} value={delayHours} onChange={(e) => setDelayHours(Number(e.target.value))} style={{ width: 60 }} />
          <span style={{ fontSize: 12, opacity: 0.75 }}>h</span>
          <button onClick={scheduleSend}>Schedule</button>
        </div>
      </div>

      {/* Queue list */}
      <div style={{ borderTop: '1px dashed #eee', paddingTop: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h4 style={{ margin: '4px 0' }}>Queued</h4>
          <button
            onClick={() => {
              setQueue([]);
              saveQueue([]);
              void log('clear_queue');
            }}
            style={{ fontSize: 12 }}>
            Clear all
          </button>
        </div>
        {queue.length === 0 ? (
          <div style={{ fontSize: 12, opacity: 0.7 }}>No queued boundaries.</div>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 8 }}>
            {queue.map((item) => (
              <li key={item.id} style={{ border: '1px solid #f1f1f1', borderRadius: 8, padding: 8 }}>
                <div style={{ fontSize: 12, opacity: 0.8 }}>
                  to <b>{item.to}</b> · fire in {countdown(item.scheduledAt)}
                </div>
                <div style={{ margin: '6px 0' }}>{item.text}</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(item.text);
                      } catch {}
                      alert('Copied. Paste in WhatsApp to send.');
                      void log('manual_send_from_queue', { id: item.id });
                    }}>
                    Send now (copy)
                  </button>
                  <button onClick={() => delay(item.id, 2)}>+2h</button>
                  <button onClick={() => delay(item.id, 24)}>+24h</button>
                  <button onClick={() => cancel(item.id)}>Cancel</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
