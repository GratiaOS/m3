export const BASE = import.meta.env.VITE_API_BASE || 'http://127.0.0.1:3033';
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

// --- Tells ---
export type Tell = {
  id: number;
  node: string;
  pre_activation?: string;
  action: string;
  created_at: string; // RFC3339
  handled?: boolean;
};

// --- Gratitude (Thanks) ---
export interface ThanksIn {
  subject: string;
  details?: string;
  kind?: string; // "ancestor" | "tool" | "place" | …
  note_id?: number;
  who?: string; // current profile if you keep one
}

export interface ThanksOut {
  id: number;
  ts: string;
  subject: string;
  details?: string | null;
  kind?: string | null;
  note_id?: number | null;
  who?: string | null;
}

// Server row shape for /retrieve results
export type RetrievedChunk = {
  id: number;
  text: string;
  tags: string[];
  profile: string;
  ts: string; // RFC3339 string
  score: number;
};

// --- Replies ---
export type ReplyOut = {
  mode: 'Poetic' | 'Sarcastic' | 'Paradox';
  text: string;
  bill?: { minutes: number; arousal: number };
  window_until?: string | null;
  actions?: string[]; // <= two quick doors
};

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

// --- Emotions / Timeline ---
export interface EmotionOut {
  id: number;
  ts: string;
  who: string;
  kind: string;
  intensity: number;
  note_id?: number | null;
  details?: string | null;
  sealed: boolean;
  archetype?: string | null;
  privacy: string;
}

// New unified TimelineItem type matching server’s timeline shape
export type TimelineItem = {
  id: number;
  ts: string;
  source: string;
  title: string;
  subtitle: string;
  meta?: Record<string, unknown>;
};

function mapEmotionToTimelineItem(e: EmotionOut): TimelineItem {
  const sealed = e.sealed === true || e.privacy === 'sealed';
  const subtitle = sealed ? '(sealed)' : (e.details ?? '').trim() || '(no details)';
  return {
    id: e.id,
    ts: e.ts,
    source: 'emotion',
    title: e.kind || 'emotion',
    subtitle,
    meta: {
      who: e.who,
      intensity: e.intensity,
      archetype: e.archetype ?? undefined,
      privacy: e.privacy ?? 'public',
      sealed,
    },
  };
}

export async function getTimeline(limit = 20): Promise<TimelineItem[]> {
  try {
    const res = await fetch(`${BASE}/timeline/recent?limit=${limit}`, {
      method: 'GET',
      headers: { ...(BEARER ? { Authorization: `Bearer ${BEARER}` } : {}) },
    });
    if (res.status === 404) {
      // fallback path
    } else {
      if (!res.ok) throw new Error(`getTimeline failed: ${res.status}`);
      return res.json() as Promise<TimelineItem[]>;
    }
  } catch (e) {
    // network error -> fallback
  }
  // Fallback: build from emotions
  const emos = await emotionsRecent(limit);
  const items = emos.map(mapEmotionToTimelineItem);
  // sort newest first and dedupe by id (keep first)
  items.sort((a, b) => (a.ts < b.ts ? 1 : a.ts > b.ts ? -1 : 0));
  const seen = new Set<number | string>();
  const uniq: TimelineItem[] = [];
  for (const it of items) {
    if (seen.has(it.id)) continue;
    seen.add(it.id);
    uniq.push(it);
  }
  return uniq;
}

export async function emotionsRecent(limit = 20): Promise<EmotionOut[]> {
  // server ignores limit for now; we keep the param for forward-compat
  return request<EmotionOut[]>('/emotions/recent', { method: 'GET' });
}

// ----- Reply API -----
export async function fetchReply(text: string): Promise<ReplyOut | null> {
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
  return (await r.json()) as ReplyOut;
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

export async function getTells(limit = 10): Promise<Tell[]> {
  const res = await fetch(`${BASE}/tells?limit=${limit}`, {
    method: 'GET',
    headers: {
      ...(BEARER ? { Authorization: `Bearer ${BEARER}` } : {}),
    },
  });
  if (!res.ok) throw new Error(`getTells failed: ${res.status}`);
  return (await res.json()) as Tell[];
}

export async function createThanks(body: ThanksIn): Promise<ThanksOut> {
  return request('/thanks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

export async function getThanks(limit = 10): Promise<ThanksOut[]> {
  return request(`/thanks?limit=${limit}`, { method: 'GET' });
}

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

export async function retrieve(body: {
  query: string;
  limit?: number;
  include_sealed?: boolean;
  profile?: string;
}): Promise<{ chunks: RetrievedChunk[] }> {
  const res = await fetch(`${BASE}/retrieve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(BEARER ? { Authorization: `Bearer ${BEARER}` } : {}) },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`retrieve failed: ${res.status}`);
  const data = await res.json();
  return Array.isArray(data) ? { chunks: data } : data;
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

export async function resolveEmotion(who: string, details?: string) {
  const headers = cleanHeaders({
    'Content-Type': 'application/json',
    Authorization: BEARER ? `Bearer ${BEARER}` : undefined,
  });
  const res = await fetch(`${BASE}/emotions/resolve`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ who, details }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
