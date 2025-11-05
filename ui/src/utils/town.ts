import { type TownBulletinPayload, type TownNewsOut } from '@/api';

export type TownKind = 'news' | 'alert' | 'note';

export type TownSpeaker = {
  species: string;
  name: string;
  raw: string;
};

export type TownBulletinItem = {
  id: number;
  town: string;
  ts: string;
  kind: TownKind;
  who: string;
  speaker: TownSpeaker;
  text: string;
  headline: string;
};

type RawTownEntry = Partial<TownNewsOut> & {
  kind?: string;
  importance?: number;
  text?: string;
  details?: string | null;
  subject?: string;
  via?: string | null;
  ts?: string;
};

const IMPORTANCE_TO_KIND: Record<number, TownKind> = {
  0: 'news',
  1: 'note',
  2: 'note',
  3: 'alert',
};

export function deriveKind(raw: RawTownEntry): TownKind {
  const candidate = raw?.kind ?? raw?.note ?? raw?.importance;
  if (typeof candidate === 'string') {
    const normalized = candidate.toLowerCase();
    if (normalized === 'news' || normalized === 'alert' || normalized === 'note') {
      return normalized;
    }
  }
  if (typeof candidate === 'number' && IMPORTANCE_TO_KIND[candidate] !== undefined) {
    return IMPORTANCE_TO_KIND[candidate];
  }
  return 'news';
}

export function parseSpeaker(raw: string | null | undefined): TownSpeaker {
  const value = (raw ?? '').trim();
  if (!value) {
    return { species: 'unknown', name: '—', raw: '—' };
  }
  const [prefix, rest] = value.split(':', 2);
  if (rest) {
    return { species: prefix || 'unknown', name: rest || '—', raw: value };
  }
  return { species: 'unknown', name: value, raw: value };
}

export function toBulletinItem(raw: RawTownEntry, fallbackTown: string): TownBulletinItem {
  const ts = raw?.created_at ?? raw?.ts ?? new Date().toISOString();
  const kind = deriveKind(raw);
  const text = raw?.headline ?? raw?.subject ?? raw?.text ?? raw?.details ?? '';
  const who = raw?.who ?? raw?.via ?? 'unknown';
  const town = raw?.town ?? fallbackTown;

  return {
    id: Number(raw?.id ?? `${town}-${ts}`),
    town,
    ts,
    kind,
    who,
    speaker: parseSpeaker(who),
    text,
    headline: text,
  };
}

export function flattenBulletinPayload(payload: TownBulletinPayload | undefined, fallbackTown: string): TownBulletinItem[] {
  if (!payload) return [];
  const list: RawTownEntry[] = Array.isArray(payload)
    ? (payload as RawTownEntry[])
    : Array.isArray((payload as { items?: RawTownEntry[] }).items)
    ? ((payload as { items?: RawTownEntry[] }).items ?? [])
    : Array.isArray((payload as { bulletin?: RawTownEntry[] }).bulletin)
    ? ((payload as { bulletin?: RawTownEntry[] }).bulletin ?? [])
    : [];

  return list.map((entry) => toBulletinItem(entry, fallbackTown));
}
