import { notify } from './utils/joy';

const BASE = 'http://127.0.0.1:3033';
const TIMEOUT_MS = 12_000;

type Method = 'POST' | 'GET';
type HeadersMap = Record<string, string | undefined>;
export type LightStatus = 'green' | 'yellow' | 'red';

// Generic fetch wrapper with timeout + friendly toasts
async function request<T = any>(path: string, body?: Record<string, unknown>, method: Method = 'POST', friendly?: string): Promise<T> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(`${BASE}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: method === 'POST' ? JSON.stringify(body ?? {}) : undefined,
      signal: ctrl.signal,
    });

    clearTimeout(t);

    if (!res.ok) {
      let msg = `${res.status} ${res.statusText}`;
      try {
        const j = await res.json();
        if (j?.error) msg = j.error;
      } catch {
        /* ignore */
      }

      notify(friendly ? `Couldn’t ${friendly.toLowerCase()} — ${msg}` : `Request failed — ${msg}`, res.status >= 500 ? 'error' : 'warning');
      throw new Error(msg);
    }

    return (await res.json()) as T;
  } catch (err: any) {
    clearTimeout(t);
    if (err?.name === 'AbortError') {
      notify(friendly ? `${friendly} is taking a nap — timed out` : 'Request timed out', 'warning');
    } else {
      notify(friendly ? `Network hiccup while trying to ${friendly.toLowerCase()}` : 'Network hiccup', 'error');
    }
    throw err;
  }
}

// ---- API surface ----

async function postJSON<T>(path: string, body: any, extraHeaders: HeadersMap = {}): Promise<T> {
  const r = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...extraHeaders },
    body: JSON.stringify(body),
  });
  return r.json();
}

export function ingest(payload: any, extraHeaders: HeadersMap = {}) {
  return postJSON('/ingest', payload, extraHeaders);
}

export function retrieve(query: string, limit = 12, includeSealed = false) {
  return postJSON('/retrieve', { query, limit, includeSealed });
}

export function snapshot() {
  return postJSON('/snapshot', {});
}
export function exportThread(threadId?: number) {
  return postJSON('/export', { thread_id: threadId });
}
export function exportCSV(threadId?: number) {
  return postJSON('/export_csv', { thread_id: threadId });
}
export function setPassphrase(passphrase: string) {
  return postJSON('/seal/set_passphrase', { passphrase });
}
export function unlock(passphrase: string) {
  return postJSON('/seal/unlock', { passphrase });
}

export async function logEnergy(energy: 'crown' | 'play' | 'dragon' | 'void' | 'life', note?: string) {
  const text = `[energy] ${energy}${note ? ` — ${note}` : ''}`;
  const tags = ['energy', `energy:${energy}`];
  return ingest({
    text,
    tags,
    profile: 'Raz',
    privacy: 'public',
    importance: 1,
  });
}

export async function listTells(limit = 50) {
  const r = await fetch(`${BASE}/tells?limit=${limit}`);
  return r.json();
}
export async function createTell(payload: { node: string; pre_activation: string; action: string }) {
  const r = await fetch(`${BASE}/tells`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return r.json();
}
export async function handleTell(id: number) {
  const r = await fetch(`${BASE}/tells/handle`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id }),
  });
  return r.json();
}

export async function getStatus() {
  const r = await fetch(`http://127.0.0.1:3033/status/get`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  return r.json();
}

export async function setStatus(color: 'green' | 'yellow' | 'red', note?: string, ttl_minutes?: number) {
  const r = await fetch(`http://127.0.0.1:3033/status/set`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ color, note, ttl_minutes }),
  });
  return r.json();
}

export async function getStatusSnapshot(): Promise<{ name: string; status: LightStatus }[]> {
  const r = await fetch(`${BASE}/status`);
  return r.json();
}

export function streamStatus(onUpdate: (updates: { name: string; status: LightStatus }[]) => void) {
  const es = new EventSource(`${BASE}/status/stream`);
  es.onmessage = (e) => {
    try {
      const data = JSON.parse(e.data);
      if (Array.isArray(data)) onUpdate(data);
    } catch {}
  };
  return () => es.close();
}

export type MemberEnergy = { name: string; energy: number };
export type PillarStatus = {
  crown: 'good' | 'watch' | 'rest';
  void: 'good' | 'watch' | 'rest';
  play: 'good' | 'watch' | 'rest';
  dragon: 'good' | 'watch' | 'rest';
  life_force: 'good' | 'watch' | 'rest';
};
export type TeamState = {
  members: MemberEnergy[];
  pillars: PillarStatus;
  note?: string | null;
  ts: string;
};

export async function getState(): Promise<TeamState> {
  const r = await fetch(`${BASE}/state/get`);
  return r.json();
}
export async function setState(payload: Partial<TeamState>): Promise<TeamState> {
  const r = await fetch(`${BASE}/state/set`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  return r.json();
}
