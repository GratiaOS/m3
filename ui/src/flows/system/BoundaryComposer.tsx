import React, { useEffect, useMemo, useState } from 'react';
import { ingest } from '@/api';

import { Heading, Subheading, Divider, Text, Strong, Input, Textarea, Badge, Button, Field, Label, Select } from '@/ui/catalyst';

const isBrowser = typeof window !== 'undefined';

/**
 * Local queue item saved in localStorage
 */
type QueuedMsg = {
  id: string;
  to: string; // e.g. "sister.exe"
  text: string;
  tone: 'firm' | 'warm' | 'gentle';
  scheduledAt: number; // epoch ms
  createdAt: number; // epoch ms
  moodAtSchedule: number; // 1..5
};

const STORAGE_KEY = 'boundaryQueue.v1';

/** Templates Vault (short, boundary-only, pre-agreed) — EN only */
const VAULT: Record<'firm' | 'warm' | 'gentle', string> = {
  firm: 'I’m not available to meet right now. Please no pressure about visits. I’ll reach out when it’s the right time.',
  warm: 'I need quiet and space right now. I’ll let you know when it works.',
  gentle: 'Thank you for checking in. For now I need calm. I’ll get back to you when I can.',
};

function loadQueue(): QueuedMsg[] {
  if (!isBrowser) return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}
function saveQueue(q: QueuedMsg[]) {
  if (!isBrowser) return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(q));
}

function inHours(h: number) {
  return Date.now() + h * 60 * 60 * 1000;
}

export default function BoundaryComposer({ to = 'sister.exe' }: { to?: string }) {
  const [tone, setTone] = useState<'firm' | 'warm' | 'gentle'>('firm');
  const [dirty, setDirty] = useState<boolean>(false);
  const [mood, setMood] = useState<number>(3); // 1..5
  const [text, setText] = useState<string>('');
  const [queue, setQueue] = useState<QueuedMsg[]>(loadQueue());
  const [delayHours, setDelayHours] = useState<number>(4); // default auto-queue +4h

  // Keep template text synced unless user edits
  const template = useMemo(() => VAULT[tone], [tone]);
  useEffect(() => {
    if (!dirty) setText(template);
  }, [template, dirty]);

  // tick for countdown re-render
  const [, forceTick] = useState(0);
  useEffect(() => {
    if (!isBrowser) return;
    const t = setInterval(() => forceTick((v) => v + 1), 1000);
    return () => clearInterval(t);
  }, []);

  // fire scheduler: when time arrives, we prompt to send (copy)
  useEffect(() => {
    if (!isBrowser) return;
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
          // MVP toast
          alert(`Boundary ready to send to ${item.to}:\n\n${item.text}\n\nCopied to clipboard.`);
          try {
            await navigator.clipboard.writeText(item.text);
          } catch {
            /* ignore clipboard errors */
          }
        });
        const remaining = queue.filter((q) => q.scheduledAt > now);
        setQueue(remaining);
        saveQueue(remaining);
      }
    }, 30000); // scan every 30s
    return () => clearInterval(timer);
  }, [queue]);

  async function log(action: string, extra: Record<string, unknown> = {}) {
    await ingest({
      text: `[boundary ${action}] to=${to} mood=${mood} tone=${tone} :: ${text}`,
      tags: ['boundary', action, tone, `mood-${mood}`],
      profile: 'Raz',
      privacy: 'private',
      importance: 1,
      ...extra,
    });
  }

  function issuesFor(t: string): string[] {
    const s = t.toLowerCase();
    const out: string[] = [];
    // apologies
    if (/\b(sorry|i'm sorry|i am sorry)\b/.test(s)) {
      out.push('Avoid apologies in a boundary (keeps message clean).');
    }
    // justifications
    if (/\bbecause\b/.test(s)) {
      out.push('Avoid long explanations ("because"); keep it short.');
    }
    // blame/accusation
    if (/\byou\b/.test(s)) {
      out.push('Avoid addressing the other as the problem; speak your need.');
    }
    // length
    if (t.length > 240) {
      out.push('Message is long; consider trimming under ~240 chars.');
    }
    return out;
  }

  const problems = issuesFor(text);
  const chars = text.length;
  const moodAdvice =
    mood <= 2 ? 'Mood low — auto-queue recommended.' : mood === 3 ? 'Neutral — you can send or queue.' : 'Mood stable — safe to send now.';

  function resetToTemplate() {
    setDirty(false);
    setText(template);
  }

  function scheduleSend() {
    if (problems.length) {
      alert('Queued anyway, but consider fixing:\n- ' + problems.join('\n- '));
    }
    const item: QueuedMsg = {
      id: crypto.randomUUID(),
      to,
      text,
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
    if (mood <= 2) {
      alert('Mood is low — better to queue and revisit later.');
      return;
    }
    if (problems.length) {
      alert('Please resolve boundary suggestions first:\n- ' + problems.join('\n- '));
      return;
    }
    await log('approved_send_now');
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      /* ignore clipboard errors */
    }
    alert('Message copied. Paste in WhatsApp to send.');
    // Optional deep link:
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

  return (
    <div className="grid gap-3 rounded-xl border border-zinc-200 p-3 dark:border-zinc-800">
      <div className="flex items-baseline gap-3">
        <Heading style={{ margin: 0 }}>Boundary Composer</Heading>
        <small className="opacity-60">
          to: <b>{to}</b>
        </small>
      </div>

      {/* Mood slider */}
      <Field style={{ display: 'grid', gap: 6 }}>
        <Label>Mood (1 = low, 5 = strong)</Label>
        <div className="flex items-center gap-3">
          <Input className="max-w-40" type="range" min={1} max={5} value={mood} onChange={(e) => setMood(Number(e.target.value))} />
          <small className="opacity-60">
            {mood} · {moodAdvice}
          </small>
        </div>
      </Field>
      <Divider />
      {/* Tone only + Reset */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <Select className="max-w-32" value={tone} onChange={(e) => setTone(e.target.value as 'firm' | 'warm' | 'gentle')}>
          <option value="firm">firm</option>
          <option value="warm">warm</option>
          <option value="gentle">gentle</option>
        </Select>
        <Button onClick={resetToTemplate}>Reset to template</Button>
      </div>

      {/* Message editor (short) */}
      <Textarea
        rows={3}
        value={text}
        onChange={(e) => {
          setDirty(true);
          setText(e.target.value);
        }}
        placeholder="Short boundary only. No empathy payload here."
        style={{ width: '100%' }}
      />
      <div className="flex justify-between text-sm opacity-60">
        <span>{chars} chars</span>
        {problems.length > 0 && (
          <span className="text-amber-500">
            {problems.length} suggestion{problems.length > 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Suggestions */}
      {problems.length > 0 && (
        <div className="bg-amber-100 border border-amber-200 text-amber-950 p-2 rounded-sm text-sm">
          <b>Suggestions:</b>
          <ul className="mt-1">
            {problems.map((p, i) => (
              <li key={i}>{p}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3">
        <Button
          onClick={sendNow}
          disabled={mood <= 2 || problems.length > 0}
          title={
            mood <= 2
              ? 'Mood low — better to queue'
              : problems.length > 0
              ? 'Please resolve suggestions before sending'
              : 'Copy & go send in WhatsApp'
          }>
          Send now (copy)
        </Button>

        <div className="flex items-center gap-4 ms-4">
          <Text className="min-w-10">Queue +</Text>
          <div className="flex items-center gap-2">
            <Input type="number" min={1} max={48} value={delayHours} onChange={(e) => setDelayHours(Number(e.target.value))} style={{ width: 60 }} />
            <small className="opacity-60">h</small>
          </div>
          <Button onClick={scheduleSend}>Schedule</Button>
        </div>
      </div>
      <Divider />
      {/* Queue list */}
      <div className="flex justify-between items-center">
        <Subheading className="my-1">Queued</Subheading>
        <Button
          onClick={() => {
            setQueue([]);
            saveQueue([]);
            void log('clear_queue');
          }}
          style={{ fontSize: 12 }}>
          Clear all
        </Button>
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
                <Button
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(item.text);
                    } catch {
                      /* ignore clipboard errors */
                    }
                    alert('Copied. Paste in WhatsApp to send.');
                    void log('manual_send_from_queue', { id: item.id });
                  }}>
                  Send now (copy)
                </Button>
                <Button onClick={() => delay(item.id, 2)}>+2h</Button>
                <Button onClick={() => delay(item.id, 24)}>+24h</Button>
                <Button onClick={() => cancel(item.id)}>Cancel</Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
