import { announce } from '@/lib/srAnnouncer';

type Listener = () => void;

const makeSignal = <T,>(initial: T) => {
  let value = initial;
  const listeners = new Set<Listener>();
  return {
    get value() {
      return value;
    },
    set(next: T) {
      if (Object.is(value, next)) return;
      value = next;
      listeners.forEach((listener) => listener());
    },
    subscribe(listener: Listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
};

const STORAGE_KEY = 'rel.align.v1';
const HINTS_KEY = 'rel.align.hints.v1';

export type Depth = 'soft' | 'deep';
type PersistedState = { consent: boolean; depth: Depth };

const safeWindow = () => (typeof window === 'undefined' ? null : window);
const safeDocument = () => (typeof document === 'undefined' ? null : document);

const defaults: PersistedState = { consent: false, depth: 'soft' };

const load = (): PersistedState => {
  const win = safeWindow();
  if (!win) return defaults;
  try {
    const raw = win.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw) as Partial<PersistedState>;
    return {
      consent: Boolean(parsed?.consent),
      depth: parsed?.depth === 'deep' ? 'deep' : 'soft',
    };
  } catch {
    return defaults;
  }
};

const persist = (state: PersistedState) => {
  const win = safeWindow();
  if (!win) return;
  try {
    win.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* ignore */
  }
};

const initial = load();
const loadHints = () => {
  const win = safeWindow();
  if (!win) return { memoryHintSeen: false };
  try {
    const raw = win.localStorage.getItem(HINTS_KEY);
    if (!raw) return { memoryHintSeen: false };
    const parsed = JSON.parse(raw) as { memoryHintSeen?: boolean };
    return { memoryHintSeen: Boolean(parsed.memoryHintSeen) };
  } catch {
    return { memoryHintSeen: false };
  }
};

export const consent$ = makeSignal<boolean>(initial.consent);
export const depth$ = makeSignal<Depth>(initial.depth);
export const hints$ = makeSignal<{ memoryHintSeen: boolean }>(loadHints());

const syncHtml = () => {
  const doc = safeDocument();
  if (!doc) return;
  const html = doc.documentElement;
  html.dataset.consent = consent$.value ? 'on' : 'off';
  html.dataset.depth = depth$.value;
};

syncHtml();

export function setConsent(next: boolean) {
  consent$.set(next);
  persist({ consent: consent$.value, depth: depth$.value });
  syncHtml();
  const win = safeWindow();
  if (win) {
    win.dispatchEvent(new CustomEvent('consent:changed', { detail: next }));
  }
  announce(next ? 'Memory on. Ledger will persist locally.' : 'Memory off. In-session only.');
}

export function setDepth(next: Depth) {
  depth$.set(next);
  persist({ consent: consent$.value, depth: depth$.value });
  syncHtml();
  const win = safeWindow();
  if (win) {
    win.dispatchEvent(new CustomEvent('depthgate:changed', { detail: next }));
  }
  announce(next === 'deep' ? 'Depth set to Deep.' : 'Depth set to Soft.');
}

export const getConsent = () => consent$.value;

export function markMemoryHintSeen() {
  if (hints$.value.memoryHintSeen) return;
  hints$.set({ memoryHintSeen: true });
  const win = safeWindow();
  if (win) {
    try {
      win.localStorage.setItem(HINTS_KEY, JSON.stringify(hints$.value));
    } catch {
      /* ignore */
    }
    win.dispatchEvent(new CustomEvent('relational:hints', { detail: hints$.value }));
  }
}

const win = safeWindow();
if (win) {
  win.addEventListener('storage', (event) => {
    if (event.key !== STORAGE_KEY || !event.newValue) return;
    try {
      const next = JSON.parse(event.newValue) as PersistedState;
      if (next.consent !== consent$.value) {
        consent$.set(next.consent);
      }
      if (next.depth !== depth$.value) {
        depth$.set(next.depth);
      }
      syncHtml();
    } catch {
      /* ignore */
    }
  });
  win.addEventListener('storage', (event) => {
    if (event.key !== HINTS_KEY || !event.newValue) return;
    try {
      const next = JSON.parse(event.newValue) as { memoryHintSeen?: boolean };
      if (typeof next.memoryHintSeen === 'boolean' && next.memoryHintSeen !== hints$.value.memoryHintSeen) {
        hints$.set({ memoryHintSeen: next.memoryHintSeen });
      }
    } catch {
      /* ignore */
    }
  });
}
