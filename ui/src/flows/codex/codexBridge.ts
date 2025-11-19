import { announce } from '@/lib/srAnnouncer';
import { createGratitudeToken } from '@/flows/value/gratitudeTokens';
import { getAuthority, mood$ } from '@gratiaos/presence-kernel';

type CodexSealDetail = {
  text: string;
  scene?: string;
  tags?: string[];
};

let lastSeal = '';
let lastTs = 0;
let mounted = false;

const CODex_EVENT = 'codex:seal';

const handleCodexSeal = (event: Event) => {
  const detail = (event as CustomEvent<CodexSealDetail | undefined>).detail;
  const text = (detail?.text ?? '').trim();
  if (!text) return;

  const now = Date.now();
  if (text === lastSeal && now - lastTs < 1500) return;
  lastSeal = text;
  lastTs = now;

  try {
    createGratitudeToken({
      message: text,
      from: getAuthority(),
      scene: detail?.scene ?? 'codex',
      resonance: { mood: mood$.value, tags: detail?.tags },
    });
  } catch (error) {
    console.warn('[codex-bridge] failed to mint gratitude token:', error);
  }

  announce('Captured in gratitude.');
};

export function startCodexBridge() {
  if (mounted) return;
  if (typeof document === 'undefined') return;
  document.addEventListener(CODex_EVENT, handleCodexSeal as EventListener);
  mounted = true;
}

export function stopCodexBridge() {
  if (!mounted) return;
  if (typeof document === 'undefined') return;
  document.removeEventListener(CODex_EVENT, handleCodexSeal as EventListener);
  mounted = false;
}
