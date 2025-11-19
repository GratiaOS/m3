import React, { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import { Button } from '@gratiaos/ui';
import { getStatus, setStatus } from '@/api';
import { useReversePoles } from '@/state/reversePoles';

type Color = 'green' | 'yellow' | 'red';

const toneActive: Record<Color, string> = {
  green:
    'border-[color-mix(in_oklab,var(--color-positive)_45%,transparent)] bg-[color-mix(in_oklab,var(--color-positive)_18%,transparent)] text-[var(--color-text)] shadow-[var(--shadow-depth-1)]',
  yellow:
    'border-[color-mix(in_oklab,var(--color-warning)_45%,transparent)] bg-[color-mix(in_oklab,var(--color-warning)_18%,transparent)] text-[var(--color-on-accent)] shadow-[var(--shadow-depth-1)]',
  red: 'border-[color-mix(in_oklab,var(--color-danger)_45%,transparent)] bg-[color-mix(in_oklab,var(--color-danger)_18%,transparent)] text-[var(--color-on-accent)] shadow-[var(--shadow-depth-1)]',
};

const toneIdle: Record<Color, string> = {
  green:
    'border-[color-mix(in_oklab,var(--color-positive)_30%,transparent)] bg-[color-mix(in_oklab,var(--color-surface)_96%,transparent)] text-[var(--color-text)] hover:bg-[color-mix(in_oklab,var(--color-positive)_12%,transparent)] hover:border-[color-mix(in_oklab,var(--color-positive)_40%,transparent)]',
  yellow:
    'border-[color-mix(in_oklab,var(--color-warning)_30%,transparent)] bg-[color-mix(in_oklab,var(--color-surface)_96%,transparent)] text-[var(--color-text)] hover:bg-[color-mix(in_oklab,var(--color-warning)_12%,transparent)] hover:border-[color-mix(in_oklab,var(--color-warning)_40%,transparent)]',
  red: 'border-[color-mix(in_oklab,var(--color-danger)_30%,transparent)] bg-[color-mix(in_oklab,var(--color-surface)_96%,transparent)] text-[var(--color-text)] hover:bg-[color-mix(in_oklab,var(--color-danger)_12%,transparent)] hover:border-[color-mix(in_oklab,var(--color-danger)_40%,transparent)]',
};

export default function StatusBar() {
  const [color, setColor] = useState<Color>('green');
  const [note, setNote] = useState('');
  const [ttl, setTtl] = useState<number | ''>('');
  const [expiresAt, setExpiresAt] = useState<string | undefined>(undefined);
  const [err, setErr] = useState<string | null>(null);
  const [pulse, setPulse] = useState(false);
  const pulseRef = useRef<number | null>(null);
  const PULSE_FALLBACK_MS = 700;
  const pulseMsRef = useRef<number>(PULSE_FALLBACK_MS);

  useEffect(() => {
    try {
      const css = getComputedStyle(document.documentElement);
      const raw = css.getPropertyValue('--dur-pulse').trim();
      if (raw) {
        let ms = 0;
        if (raw.endsWith('ms')) ms = parseFloat(raw);
        else if (raw.endsWith('s')) ms = parseFloat(raw) * 1000;
        else ms = parseFloat(raw);
        if (!Number.isNaN(ms) && ms > 0) pulseMsRef.current = ms;
      }
    } catch {}
  }, []);

  const { enabled: rtpEnabled, toggleEnabled, units, setUnit, resetUnits, remaining } = useReversePoles();

  function triggerPulse() {
    setPulse(true);
    if (pulseRef.current) window.clearTimeout(pulseRef.current);
    pulseRef.current = window.setTimeout(() => setPulse(false), pulseMsRef.current);
  }

  async function refresh() {
    try {
      setErr(null);
      const status = await getStatus();
      setColor(status.color);
      setNote(status.note || '');
      setExpiresAt(
        status.expires_at ? new Date(status.expires_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) : undefined
      );
      triggerPulse();
    } catch (e: any) {
      setErr(e?.message ?? 'Failed to fetch status');
    }
  }

  async function apply(nextColor: Color) {
    try {
      setErr(null);
      await setStatus(nextColor, note || undefined, ttl === '' ? undefined : Number(ttl));
      await refresh();
    } catch (e: any) {
      setErr(e?.message ?? 'Failed to save status');
    }
  }

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 15_000);
    return () => clearInterval(id);
  }, []);

  const chip = (tone: Color, label: string) => (
    <button
      key={tone}
      type="button"
      onClick={() => apply(tone)}
      aria-pressed={color === tone}
      className={clsx(
        'rounded-full px-3 py-1 text-sm font-medium transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_oklab,var(--color-accent)_35%,transparent)]',
        color === tone ? toneActive[tone] : toneIdle[tone],
        color === tone && pulse ? 'animate-breathe' : null
      )}
      title={`Set ${tone}`}>
      {label}
    </button>
  );

  return (
    <div className="flex flex-wrap items-center gap-3 text-sm text-[var(--color-text)]">
      <strong className="text-xs font-semibold uppercase tracking-wide text-[color-mix(in_oklab,var(--color-text)_65%,transparent)]">Status:</strong>
      {chip('green', 'Green')}
      {chip('yellow', 'Yellow')}
      {chip('red', 'Red')}
      <input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="note (optional)"
        className="min-w-[14rem] rounded-lg border border-[color-mix(in_oklab,var(--color-border)_45%,transparent)] bg-[color-mix(in_oklab,var(--color-surface)_95%,transparent)] px-3 py-2 text-sm text-[var(--color-text)] placeholder:text-[color-mix(in_oklab,var(--color-text)_55%,transparent)] shadow-sm focus:outline-none focus:ring-2 focus:ring-[color-mix(in_oklab,var(--color-accent)_35%,transparent)]"
      />
      <input
        value={ttl}
        onChange={(e) => setTtl(e.target.value === '' ? '' : Number(e.target.value))}
        placeholder="TTL min"
        type="number"
        min={0}
        className="w-24 rounded-lg border border-[color-mix(in_oklab,var(--color-border)_45%,transparent)] bg-[color-mix(in_oklab,var(--color-surface)_95%,transparent)] px-3 py-2 text-sm text-[var(--color-text)] placeholder:text-[color-mix(in_oklab,var(--color-text)_55%,transparent)] shadow-sm focus:outline-none focus:ring-2 focus:ring-[color-mix(in_oklab,var(--color-accent)_35%,transparent)]"
      />
      <Button
        tone="default"
        variant="solid"
        density="snug"
        onClick={() => apply(color)}
        className="hover:-translate-y-0.5 hover:shadow-[var(--shadow-depth-1)]">
        Save
      </Button>
      {err ? (
        <span role="status" className="text-xs text-[color-mix(in_oklab,var(--color-danger)_65%,transparent)]">
          {err}
        </span>
      ) : null}
      <span className="text-xs opacity-70">{expiresAt ? `auto-resets at ${expiresAt}` : 'no auto-reset'}</span>
      <div
        className={clsx(
          'ml-3 flex items-center gap-2 rounded-full border px-2 py-1 transition-all',
          rtpEnabled
            ? 'bg-[color-mix(in_oklab,var(--color-accent)_14%,transparent)] border-[color-mix(in_oklab,var(--color-border)_60%,transparent)] shadow-[var(--shadow-depth-1)]'
            : 'bg-[color-mix(in_oklab,var(--color-surface)_94%,transparent)] border-[color-mix(in_oklab,var(--color-border)_50%,transparent)]'
        )}>
        <button
          type="button"
          onClick={toggleEnabled}
          title="Reverse the Poles (abundance mode)"
          className={clsx(
            'rounded-full px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wide transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_oklab,var(--color-accent)_45%,transparent)]',
            rtpEnabled
              ? 'border-transparent bg-[var(--color-accent)] text-[var(--color-on-accent)] -translate-y-0.5 shadow-[var(--shadow-depth-1)]'
              : 'border-[color-mix(in_oklab,var(--color-border)_45%,transparent)] bg-[color-mix(in_oklab,var(--color-surface)_92%,transparent)] text-[var(--color-text)]'
          )}>
          RTP {rtpEnabled ? 'ON' : 'OFF'}
        </button>
        <div className="flex items-center gap-2">
          {units.map((used, index) => (
            <button
              key={index}
              aria-label={`capacity unit ${index + 1} ${used ? 'spent' : 'available'}`}
              role="switch"
              aria-checked={used}
              title={used ? 'Mark available' : 'Mark spent'}
              onClick={() => rtpEnabled && setUnit(index, !used)}
              className={clsx(
                'h-3.5 w-3.5 rounded-full border transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_oklab,var(--color-accent)_35%,transparent)]',
                rtpEnabled ? 'cursor-pointer opacity-100' : 'cursor-not-allowed opacity-40',
                used
                  ? 'border-[color-mix(in_oklab,var(--color-positive)_55%,transparent)] bg-[color-mix(in_oklab,var(--color-positive)_70%,transparent)] shadow-[0_0_0_2px_color-mix(in_oklab,var(--color-positive)_25%,transparent)]'
                  : 'border-[color-mix(in_oklab,var(--color-border)_55%,transparent)] bg-[color-mix(in_oklab,var(--color-surface)_96%,transparent)]'
              )}
            />
          ))}
        </div>
        {rtpEnabled && <span className="text-xs opacity-70">{remaining}/3</span>}
        <button
          type="button"
          onClick={resetUnits}
          disabled={!rtpEnabled}
          className={clsx(
            'rounded-full border px-2.5 py-1 text-xs font-medium transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_oklab,var(--color-accent)_35%,transparent)]',
            rtpEnabled
              ? 'border-[color-mix(in_oklab,var(--color-border)_45%,transparent)] bg-[color-mix(in_oklab,var(--color-surface)_92%,transparent)] text-[var(--color-text)] hover:-translate-y-0.5 hover:shadow-[var(--shadow-depth-1)]'
              : 'cursor-not-allowed border-[color-mix(in_oklab,var(--color-border)_45%,transparent)] bg-[color-mix(in_oklab,var(--color-surface)_94%,transparent)] text-[var(--color-text)] opacity-50'
          )}>
          reset
        </button>
        {rtpEnabled && remaining === 0 && (
          <span className="text-xs font-medium text-[color-mix(in_oklab,var(--color-positive)_65%,transparent)]">Rest is repair.</span>
        )}
      </div>
    </div>
  );
}
