/**
 * ──────────────────────────────────────────────────────────────────────────────
 * api.ts — Typed client for the M3 Memory Server
 * ──────────────────────────────────────────────────────────────────────────────
 * Purpose
 *   One small, typed front‑door for all UI → server HTTP calls.
 *
 * Principles
 *   • Keep wire types minimal and strictly mirror server fields.
 *   • Prefer the generic `request<T>()` helper so headers/BASE/auth are consistent.
 *   • Errors: non‑2xx responses throw with the server text body as the Error message.
 *   • Be resilient to partial backends: some helpers include graceful fallbacks.
 *
 * Sections
 *   - Tells, Thanks
 *   - Retrieval & Ingest
 *   - Replies (small LLM‑like endpoint)
 *   - Emotions / Timeline (with fallback)
 *   - Panic flow
 *   - Status (team + member lights) + SSE stream
 *   - Towns (“Pad” news/bulletin) + CatTown conveniences
 *
 * Notes
 *   • BASE is read from `VITE_API_BASE` at build time; defaults to localhost.
 *   • Auth: looks for a bearer token under `localStorage['m3_token']`. If you
 *     embed this module outside the browser (e.g., SSR/Electron main), gate
 *     access to `localStorage` or inject a token via headers when calling `request`.
 *   • When adding new endpoints, keep JSDoc examples close to the helpers.
 */
import type { BridgeSuggestion, BridgeKindAlias } from '@/types/patterns';
import { normalizeBridgeKind } from '@/types/patterns';
// Base URL for the server. Override with VITE_API_BASE in `.env` or CI.
export const BASE = import.meta.env.VITE_API_BASE || 'http://127.0.0.1:3033';
// Optional bearer read once at module init. UI can update storage and refresh.
const BEARER = localStorage.getItem('m3_token') || '';

type HeadersMap = Record<string, string | undefined>;

/**
 * Remove undefined header values before issuing fetch.
 * Ensures we don't accidentally send `"Authorization": "Bearer undefined"`.
 */
function cleanHeaders(h: HeadersMap): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(h)) {
    if (typeof v === 'string') out[k] = v;
  }
  return out;
}

// ── Status types (shared with Member Light endpoints) ─────────────────────────
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

// Normalize an Emotion row into a generic timeline item for UI rendering.
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

/**
 * Fetch unified timeline items.
 * Primary: GET /timeline/recent (if the server exposes it).
 * Fallback: build a list from /emotions/recent (sorted, deduped).
 * This allows the UI to keep working while the backend evolves.
 */
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
  // Small helper for simple POST JSON endpoints (used by legacy helpers below).
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

/**
 * Generic JSON request with consistent headers and error surface.
 * Throws Error(text) on non‑2xx so callers can show the server message verbatim.
 */
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

/**
 * RAG‑style retrieval endpoint.
 * Returns `{ chunks }` even if the server responds with a bare array for legacy clients.
 */
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

/**
 * Subscribe to status updates via Server‑Sent Events.
 * Usage:
 *   const stop = streamStatus(setUpdates);
 *   // later…
 *   stop();
 */
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

// --- Patterns API -----------------------------------------------------------
export async function fetchBridge(kind: BridgeKindAlias, intensity: number = 0.6): Promise<BridgeSuggestion> {
  const search = new URLSearchParams();
  search.set('kind', normalizeBridgeKind(kind));
  if (Number.isFinite(intensity)) search.set('intensity', intensity.toString());
  return request<BridgeSuggestion>(`/patterns/bridge_suggest?${search.toString()}`, { method: 'GET' });
}

export type PatternCategory = 'mirror' | 'repeat' | 'sequence' | 'none';
export type SignalStrength = 'low' | 'medium' | 'high';

export type NumberSignalResponse = {
  classification: 'signal' | 'anxiety_loop' | 'neutral';
  reasoning: string;
  category: PatternCategory;
  strength: SignalStrength;
};

export async function postNumberSignal(input: { label: string; effect?: string }): Promise<NumberSignalResponse> {
  const payload = {
    label: input.label,
    effect: input.effect,
  };
  return request<NumberSignalResponse>('/patterns/number_signal', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

// --- Towns (Pad) -----------------------------------------------------------

/**
 * POST /towns/news payload.
 * `importance`: 0..3 where 0=info, 1=note, 2=signal, 3=urgent.
 * Examples:
 *   { town: "CatTown", subject: "Breakfast delivered", via: "Manolita" }
 *   { town: "CatTown", subject: "Sunbeam shifts to couch at 14:00", via: "Felix", importance: 1 }
 */
export type TownNewsIn = {
  town: string; // e.g., "CatTown"
  headline: string; // e.g., "Sunbeam shifts to couch at 14:00"
  who?: string;
  note?: string;
  created_at?: string;
};

/**
 * Server response shape for a single bulletin row.
 */
export type TownNewsOut = {
  id: number;
  town: string;
  headline: string;
  who?: string | null;
  note?: string | null;
  created_at: string;
};

export type TownBulletinPayload =
  | TownNewsOut[]
  | { items?: TownNewsOut[] }
  | { bulletin?: TownNewsOut[] };

/**
 * Post a news item into a town bulletin.
 * Mirrors POST /towns/news.
 */
export async function postTownNews(input: TownNewsIn): Promise<TownNewsOut> {
  return request<TownNewsOut>('/towns/news', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
}

/**
 * Fetch recent bulletin items for an optional town.
 * Mirrors GET /towns/bulletin?town=CatTown&limit=20
 */
export async function getTownBulletin(params: { town?: string; limit?: number } = {}): Promise<TownBulletinPayload> {
  const search = new URLSearchParams();
  if (params.town) search.set('town', params.town);
  if (Number.isFinite(params.limit as number)) search.set('limit', String(params.limit));
  const qs = search.toString();
  const path = qs ? `/towns/bulletin?${qs}` : '/towns/bulletin';
  return request<TownBulletinPayload>(path, { method: 'GET' });
}

// --- CatTown convenience ----------------------------------------------------

// Default town used throughout the UI.
export const DEFAULT_TOWN = 'CatTown';

// Convenience wrapper that targets CatTown unless overridden.
export function postCatTownNews(input: Omit<TownNewsIn, 'town'> & { town?: string }): Promise<TownNewsOut> {
  return postTownNews({
    town: input.town ?? DEFAULT_TOWN,
    headline: input.headline,
    who: input.who,
    note: input.note,
    created_at: input.created_at,
  });
}

// Fetch newest CatTown items (limit optional, default server‑side).
export function getCatTownBulletin(limit?: number): Promise<TownBulletinPayload> {
  return getTownBulletin({ town: DEFAULT_TOWN, limit });
}
