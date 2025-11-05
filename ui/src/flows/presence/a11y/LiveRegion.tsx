import React, { useEffect, useRef, useState } from 'react';

// Imperative emitter reference set when the LiveRegion mounts.
let emit: ((msg: string) => void) | null = null;

/**
 * Polite, atomic live region for one-off announcements (focus handoffs, etc.).
 * Mount exactly once near the app root. Use `announce(msg)` to speak.
 */
export function LiveRegion() {
  const [msg, setMsg] = useState('');
  const t = useRef<number | null>(null);

  useEffect(() => {
    emit = (m: string) => {
      // Clear then set shortly after so SRs re-announce identical strings.
      setMsg('');
      if (t.current) window.clearTimeout(t.current);
      t.current = window.setTimeout(() => setMsg(m), 10);
    };
    return () => {
      emit = null;
      if (t.current) window.clearTimeout(t.current);
    };
  }, []);

  return (
    <div
      id="garden-live"
      role="status"
      aria-live="polite"
      aria-atomic="true"
      // Visually hidden but present for assistive tech.
      style={{ position: 'absolute', left: -9999, height: 1, width: 1, overflow: 'hidden' }}
    >
      {msg}
    </div>
  );
}

/** Imperatively announce a short, self-contained message. */
export function announce(msg: string) {
  if (emit) emit(msg);
}
