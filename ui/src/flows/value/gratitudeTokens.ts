import { createSignal } from '@gratiaos/presence-kernel';
import { consent$ } from '@/flows/relational/relationalAlignment';

export interface GratitudeToken {
  id: string;
  from: string;
  to?: string;
  message: string;
  timestamp: number;
  scene?: string;
  resonance?: unknown;
}

const STORAGE_KEY = 'garden.gratitude.ledger';
const BOUNDARY_STORAGE_KEY = 'garden.boundary.ledger';

const loadInitialLedger = (): GratitudeToken[] => {
  if (typeof window === 'undefined') return [];
  try {
    const cached = window.localStorage.getItem(STORAGE_KEY);
    if (cached) return JSON.parse(cached) as GratitudeToken[];
  } catch {
    // ignore storage errors (private mode, etc.)
  }
  return [];
};

export const gratitudeLedger$ = createSignal<GratitudeToken[]>(loadInitialLedger());

const saveGratitudeLedger = (ledger: GratitudeToken[]) => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ledger));
  } catch {
    /* ignore */
  }
};

const loadBoundaryLedger = (): BoundaryToken[] => {
  if (typeof window === 'undefined') return [];
  try {
    const cached = window.localStorage.getItem(BOUNDARY_STORAGE_KEY);
    if (cached) return JSON.parse(cached) as BoundaryToken[];
  } catch {
    /* ignore */
  }
  return [];
};

const saveBoundaryLedger = (ledger: BoundaryToken[]) => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(BOUNDARY_STORAGE_KEY, JSON.stringify(ledger));
  } catch {
    /* ignore */
  }
};

const randomId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2);
};

function pushCap<T>(arr: T[], item: T, cap = 500): T[] {
  const next = [...arr, item];
  const overflow = next.length - cap;
  if (overflow > 0) next.splice(0, overflow);
  return next;
}

const shouldPersist = () => consent$.value === true;

export function createGratitudeToken(token: Partial<Omit<GratitudeToken, 'id' | 'timestamp'>> & { message: string }) {
  const entry: GratitudeToken = {
    id: `gt-${randomId()}`,
    from: token.from ?? 'local-user',
    to: token.to,
    message: token.message.trim(),
    timestamp: Date.now(),
    scene: token.scene,
    resonance: token.resonance,
  };

  const next = pushCap(gratitudeLedger$.value, entry);
  gratitudeLedger$.set(next);
  if (shouldPersist()) {
    saveGratitudeLedger(next);
  }
  return entry;
}

export type BodySignal = 'soft' | 'tight' | '';

export interface BoundaryToken {
  id: string;
  from: string;
  message: string;
  rewrite?: string;
  classification: 'constant' | 'variable';
  microAct?: string;
  body?: BodySignal;
  timestamp: number;
  scene?: string;
}

export const boundaryLedger$ = createSignal<BoundaryToken[]>(loadBoundaryLedger());

export function createBoundaryToken(token: Partial<Omit<BoundaryToken, 'id' | 'timestamp'>> & { message: string }) {
  const entry: BoundaryToken = {
    id: `bt-${randomId()}`,
    from: token.from ?? 'local-user',
    message: token.message.trim(),
    rewrite: token.rewrite?.trim() || undefined,
    classification: token.classification ?? 'variable',
    microAct: token.microAct?.trim() || undefined,
    body: token.body && token.body.length ? token.body : undefined,
    timestamp: Date.now(),
    scene: token.scene ?? 'Decode',
  };

  const next = pushCap(boundaryLedger$.value, entry);
  boundaryLedger$.set(next);
  if (shouldPersist()) {
    saveBoundaryLedger(next);
  }
  return entry;
}

export function clearGratitudeLedger() {
  gratitudeLedger$.set([]);
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
  gratitudeLedger$.emit([]);
}

export function clearBoundaryLedger() {
  boundaryLedger$.set([]);
  try {
    window.localStorage.removeItem(BOUNDARY_STORAGE_KEY);
  } catch {
    /* ignore */
  }
  boundaryLedger$.emit([]);
}

export function exportLedgerBlob(kind: 'gratitude' | 'boundary') {
  const data = kind === 'gratitude' ? gratitudeLedger$.value : boundaryLedger$.value;
  return new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
}

consent$.subscribe(() => {
  if (shouldPersist()) {
    saveGratitudeLedger(gratitudeLedger$.value);
    saveBoundaryLedger(boundaryLedger$.value);
  }
});

async function hashText(text: string): Promise<string> {
  try {
    if (crypto?.subtle && typeof TextEncoder !== 'undefined') {
      const data = new TextEncoder().encode(text);
      const buffer = await crypto.subtle.digest('SHA-256', data);
      return Array.from(new Uint8Array(buffer))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('')
        .slice(0, 16);
    }
  } catch {
    /* ignore */
  }
  let hash = 5381;
  for (let i = 0; i < text.length; i++) {
    hash = ((hash << 5) + hash) + text.charCodeAt(i);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

export async function exportLedgerRedactedBlob(kind: 'gratitude' | 'boundary', mode: 'hash' | 'remove' = 'hash') {
  const source = kind === 'gratitude' ? gratitudeLedger$.value : boundaryLedger$.value;
  const redacted = await Promise.all(source.map(async (token) => {
    const base = {
      id: token.id,
      timestamp: token.timestamp,
      scene: token.scene ?? 'Garden',
      ...(kind === 'boundary' ? { classification: token.classification, microAct: token.microAct } : {}),
    };
    if (mode === 'remove') {
      return base;
    }
    return {
      ...base,
      messageHash: await hashText(String(token.message ?? '')),
    };
  }));

  return new Blob([JSON.stringify(redacted, null, 2)], { type: 'application/json' });
}
