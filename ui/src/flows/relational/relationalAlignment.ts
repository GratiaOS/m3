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

export const consent$ = makeSignal<boolean>(initial.consent);
export const depth$ = makeSignal<Depth>(initial.depth);

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
}

export function setDepth(next: Depth) {
  depth$.set(next);
  persist({ consent: consent$.value, depth: depth$.value });
  syncHtml();
  const win = safeWindow();
  if (win) {
    win.dispatchEvent(new CustomEvent('depthgate:changed', { detail: next }));
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
}
