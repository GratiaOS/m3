const BASE = import.meta.env.VITE_API_BASE || 'http://127.0.0.1:3033';
const BEARER = localStorage.getItem('m3_token') || '';

type HeadersMap = Record<string, string | undefined>;

function cleanHeaders(h: HeadersMap): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(h)) {
    if (typeof v === 'string') out[k] = v;
  }
  return out;
}

export type LightStatus = 'green' | 'yellow' | 'red';
export type LightColor = LightStatus;

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

// ----- Reply API -----
export type ReplyMode = 'Poetic' | 'Sarcastic' | 'Paradox';
export interface ReplyBill {
  minutes: number;
  arousal: number;
}
export interface ReplyResponse {
  mode: ReplyMode;
  text: string;
  doors: [string, string];
  bill?: ReplyBill;
  window_until?: string | null;
}

export async function fetchReply(text: string): Promise<ReplyResponse | null> {
  const r = await fetch(`${BASE}/reply`, {
    method: 'POST',
    headers: cleanHeaders({
      'Content-Type': 'application/json',
      Authorization: BEARER ? `Bearer ${BEARER}` : undefined,
    }),
    body: JSON.stringify({ text }),
  });
  if (r.status === 204) return null; // gate closed
  if (!r.ok) throw new Error(await r.text());
  return (await r.json()) as ReplyResponse;
}

export type PanicOut = {
  whisper: string;
  breath: string;
  doorway: string;
  anchor: string;
  logged?: boolean;
};

export type PanicMode = 'default' | 'fearVisible';

export type PanicRequest = {
  whisper?: string;
  breath?: string;
  doorway?: string;
  anchor?: string;
  mode?: PanicMode; // when present, server fills defaults
};

// ---- API surface ----

async function postJSON<T>(path: string, body: Record<string, unknown>, extraHeaders: HeadersMap = {}): Promise<T> {
  const baseHeaders: HeadersMap = {
    'Content-Type': 'application/json',
    Authorization: BEARER ? `Bearer ${BEARER}` : undefined,
    ...extraHeaders,
  };
  const headers = cleanHeaders(baseHeaders);
  const r = await fetch(`${BASE}${path}`, { method: 'POST', headers, body: JSON.stringify(body) });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

// Generic request wrapper (GET/POST/etc.)
export async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = cleanHeaders({
    'Content-Type': 'application/json',
    Authorization: BEARER ? `Bearer ${BEARER}` : undefined,
    ...(init.headers || {}),
  } as HeadersMap);
  const res = await fetch(`${BASE}${path}`, { ...init, headers });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<T>;
}

export type IngestPrivacy = 'public' | 'sealed' | 'private';

export type IngestPayload = {
  text: string;
  tags?: string[];
  profile?: string;
  privacy?: IngestPrivacy;
  importance?: number;
  // allow forward-compat extension
  [k: string]: unknown;
};

export function ingest(payload: IngestPayload, extraHeaders: HeadersMap = {}) {
  return postJSON('/ingest', payload, extraHeaders);
}

export function retrieve(query: string, limit = 12, includeSealed = false) {
  return postJSON('/retrieve', { query, limit, includeSealed });
}

//TODO
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

export interface CreateTellPayload {
  node: string;
  pre_activation?: string;
  action: string;
  created_at?: string; // RFC3339 optional
}

export async function createTell(payload: CreateTellPayload): Promise<unknown> {
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
  const r = await fetch(`${BASE}/status/get`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  return r.json();
}

export async function setStatus(color: 'green' | 'yellow' | 'red', note?: string, ttl_minutes?: number) {
  const r = await fetch(`${BASE}/status/set`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ color, note, ttl_minutes }),
  });
  return r.json();
}

// --- Member Light (per-person) ---
export interface SetMemberLightPayload {
  name: string;
  status: LightColor;
  note?: string;
  ttl_minutes?: number;
}

export async function setMemberLight(body: SetMemberLightPayload): Promise<unknown> {
  const r = await fetch(`${BASE}/status`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
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
    } catch {
      // Ignore malformed status events
    }
  };
  return () => es.close();
}

export async function getState(): Promise<TeamState> {
  const r = await fetch(`${BASE}/state/get`);
  return r.json();
}
export async function setState(payload: Partial<TeamState>): Promise<TeamState> {
  const r = await fetch(`${BASE}/state/set`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  return r.json();
}

export async function runPanic(req: PanicRequest = { mode: 'default' }): Promise<PanicOut> {
  const headers = cleanHeaders({
    'Content-Type': 'application/json',
    Authorization: BEARER ? `Bearer ${BEARER}` : undefined,
  });
  const res = await fetch(`${BASE}/panic`, {
    method: 'POST',
    headers,
    body: JSON.stringify(req ?? {}),
  });
  if (!res.ok) throw new Error(`panic failed: ${res.status}`);
  return (await res.json()) as PanicOut;
}

export interface PanicLast {
  ts: string;
  whisper: string;
  breath: string;
  doorway: string;
  anchor: string;
  path: string;
}

export async function getPanicLast(): Promise<PanicLast | null> {
  try {
    return await request<PanicLast>('/panic/last', { method: 'GET' });
  } catch {
    return null; // endpoint absent or no logs yet
  }
}
