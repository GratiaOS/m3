import React, { useEffect, useRef, useState, useCallback } from 'react';
import { runPanic } from '../api';
import { toast } from './Toaster';

type PanicResult = {
  whisper: string;
  breath: string;
  doorway: string;
  anchor: string;
};

export function PanicButton() {
  const [pressing, setPressing] = useState(false);
  const timer = useRef<number | null>(null);
  const firedRef = useRef(false);
  const HOLD_MS = 600;

  const fire = useCallback(async () => {
    try {
      const res = await runPanic();
      const msg = `🌬️ ${res.whisper}\n` + `🫁 ${res.breath}\n` + `🚪 ${res.doorway}\n` + `⚓ ${res.anchor}`;
      toast({ level: 'success', title: 'Redirect', body: msg, icon: '🧭', ttl: 5000 });
    } catch (err) {
      // Fallback: local defaults
      const local: PanicResult = {
        whisper: 'This is Empire’s choke, not my truth.',
        breath: 'double_exhale:in2-out4',
        doorway: 'drink_water',
        anchor: 'Flow > Empire.',
      };
      const msg = `🌬️ ${local.whisper}\n` + `🫁 ${local.breath}\n` + `🚪 ${local.doorway}\n` + `⚓ ${local.anchor}`;
      toast({ level: 'info', title: 'Redirect (local)', body: msg, icon: '🌬️', ttl: 5000 });
    }
  }, []);

  const onDown = () => {
    setPressing(true);
    firedRef.current = false;
    timer.current = window.setTimeout(() => {
      firedRef.current = true;
      fire();
      setPressing(false);
      timer.current = null;
    }, HOLD_MS); // long-press
  };

  const onUp = () => {
    setPressing(false);
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
      if (!firedRef.current) {
        // short tap feedback so it doesn't feel like "nothing happened"
        toast({
          level: 'info',
          title: 'Hold to Panic',
          body: 'Press & hold ~0.6s (or Alt+P) to trigger the redirect.',
          icon: '🧭',
          ttl: 2500,
        });
      }
    }
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.altKey && (e.key === 'p' || e.key === 'P')) {
        e.preventDefault();
        fire();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [fire]);

  return (
    <button
      onMouseDown={onDown}
      onMouseUp={onUp}
      onMouseLeave={onUp}
      onTouchStart={onDown}
      onTouchEnd={onUp}
      title="Hold to Panic (Alt+P)"
      className={`px-3 py-1 rounded-md text-sm font-medium transition
        ${pressing ? 'bg-red-600 text-white' : 'bg-red-100 text-red-700 hover:bg-red-200'}`}
      aria-label="Hold to Panic">
      ⚡ Panic
    </button>
  );
}
