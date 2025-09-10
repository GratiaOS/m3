import React, { useEffect, useMemo, useState } from 'react';
import { toast } from './Toaster';
import { getState, setState, TeamState, PillarStatus, getPanicLast, type PanicLast, getTells, type Tell, resolveEmotion } from '../api';
import { Heading, Subheading, Divider, Text, Strong, Input, Textarea, Badge, Button } from '@/ui/catalyst';

const isDev = import.meta.env.DEV;

const PILLAR_KEYS: (keyof PillarStatus)[] = ['crown', 'void', 'play', 'dragon', 'life_force'];

const PILLAR_ICON: Record<keyof PillarStatus, string> = {
  crown: '👑',
  void: '🕳️',
  play: '🏀',
  dragon: '🐉',
  life_force: '⚡️',
};

const DECISION_ICON: Record<'GO' | 'WAIT' | 'REST', string> = {
  GO: '✅',
  WAIT: '⏳',
  REST: '🛌',
};

export default function Dashboard() {
  const [state, set] = useState<TeamState | null>(null);
  const [saving, setSaving] = useState(false);
  const [lastRedirect, setLastRedirect] = useState<PanicLast | null>(null);
  const [tells, setTells] = React.useState<Tell[]>([]);
  const [landing, setLanding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedSnapshot, setSavedSnapshot] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const s = await getState();
        if (isDev) console.debug('[Dashboard] getState() ->', s);
        if (s) {
          set(s);
          setSavedSnapshot(JSON.stringify({ members: s.members, pillars: s.pillars, note: s.note || '' }));
        } else {
          setError('getState() returned empty data');
        }
      } catch (e) {
        console.error('[Dashboard] getState() failed', e);
        setError('Failed to load team state');
      }

      try {
        const last = await getPanicLast();
        if (isDev) console.debug('[Dashboard] getPanicLast() ->', last);
        setLastRedirect(last);
      } catch (e) {
        if (isDev) console.warn('[Dashboard] getPanicLast() failed', e);
      }

      try {
        const xs = await getTells(5);
        if (isDev) console.debug('[Dashboard] getTells(5) ->', xs);
        setTells(xs);
      } catch (e) {
        if (isDev) console.warn('[Dashboard] getTells() failed', e);
      }
    })();
  }, []);

  // PanicLast type now comes from ../api:
  // export interface PanicLast {
  //   ts: string; whisper: string; breath: string; doorway: string; anchor: string; path: string;
  // }

  // Demo-state loader: enables UI development when the API is unavailable.
  // Safe to keep in production; it only runs when you click "Load demo state".
  function makeSampleState(): TeamState {
    return {
      ts: new Date().toISOString(),
      note: 'Demo state (API unavailable).',
      members: [
        { name: 'Raz', energy: 72 },
        { name: 'S', energy: 68 },
      ],
      pillars: {
        crown: 'watch',
        void: 'good',
        play: 'good',
        dragon: 'watch',
        life_force: 'good',
      },
    };
  }

  function timeAgo(iso: string): string {
    const then = new Date(iso).getTime();
    const sec = Math.max(1, Math.floor((Date.now() - then) / 1000));
    if (sec < 60) return `${sec}s ago`;
    const min = Math.floor(sec / 60);
    if (min < 60) return `${min}m ago`;
    const hr = Math.floor(min / 60);
    if (hr < 24) return `${hr}h ago`;
    const d = Math.floor(hr / 24);
    return `${d}d ago`;
  }

  async function landFromRedirect() {
    if (!lastRedirect || landing) return;
    setLanding(true);
    try {
      const details =
        `doorway: ${lastRedirect.doorway || '—'} | ` + `anchor: ${lastRedirect.anchor || '—'} | ` + `whisper: ${lastRedirect.whisper || '—'}`;
      await resolveEmotion('Raz', details);
      toast({ level: 'success', title: 'Gratitude landed', body: 'Arc sealed in EmotionalOS.', icon: '💚' });
    } catch (e) {
      toast({ level: 'error', title: 'Failed to land gratitude', body: String(e), icon: '⚠️' });
    } finally {
      setLanding(false);
    }
  }

  function loadDemo() {
    const demo = makeSampleState();
    set(demo);
    setSavedSnapshot(JSON.stringify({ members: demo.members, pillars: demo.pillars, note: demo.note || '' }));
    setError(null);
  }

  const avg = useMemo(() => {
    if (!state) return 0;
    return Math.round(state.members.reduce((a, m) => a + m.energy, 0) / Math.max(1, state.members.length));
  }, [state]);

  const pillarScore = useMemo(() => {
    if (!state) return { good: 0, watch: 0, rest: 0 };
    const vals = PILLAR_KEYS.map((k) => state.pillars[k]);
    return {
      good: vals.filter((v) => v === 'good').length,
      watch: vals.filter((v) => v === 'watch').length,
      rest: vals.filter((v) => v === 'rest').length,
    };
  }, [state]);

  const isDirty = useMemo(() => {
    if (!state) return false;
    const snapshot = JSON.stringify({ members: state.members, pillars: state.pillars, note: state.note || '' });
    return snapshot !== savedSnapshot;
  }, [state, savedSnapshot]);

  const decision = useMemo(() => {
    if (!state) return { label: '…', detail: '' } as const;
    if (state.members.length === 0) return { label: '…', detail: 'Add at least one team member to start' } as const;
    if (avg >= 75 && pillarScore.good >= 3 && pillarScore.rest === 0) return { label: 'GO', detail: 'Energy green and pillars stable' } as const;
    if (avg >= 60 && pillarScore.rest <= 1) return { label: 'WAIT', detail: 'Top up life force or stabilize 1 pillar' } as const;
    return { label: 'REST', detail: 'Recover energy + fix red pillars before launching' } as const;
  }, [avg, pillarScore, state]);

  function mutateMember(i: number, energy: number) {
    if (!state) return;
    const members = [...state.members];
    members[i] = { ...members[i], energy };
    set({ ...state, members });
  }
  function mutatePillar(k: keyof PillarStatus, v: PillarStatus[keyof PillarStatus]) {
    if (!state) return;
    set({ ...state, pillars: { ...state.pillars, [k]: v } });
  }

  async function save() {
    if (!state) return;
    setSaving(true);
    try {
      const next = await setState({ members: state.members, pillars: state.pillars, note: state.note });
      set(next);
      setSavedSnapshot(JSON.stringify({ members: next.members, pillars: next.pillars, note: next.note || '' }));
      toast({ level: 'success', title: 'State saved', body: 'Saved just now', icon: '💾' });
      setError(null);
    } catch (e) {
      setError('Failed to save state');
      toast({ level: 'error', title: 'Save failed', body: String(e), icon: '⚠️' });
    } finally {
      setSaving(false);
    }
  }

  if (!state) {
    return (
      <div className="grid gap-3 rounded-xl border border-zinc-200 p-3 dark:border-zinc-800" role="status" aria-live="polite">
        <div className="text-sm opacity-70" aria-label="Loading">
          Loading dashboard…
        </div>
        {error && (
          <div
            role="alert"
            className="rounded-md border border-amber-300 bg-amber-50 p-2 text-amber-900 dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-200">
            {error}. Check your API/server in `src/api` and network tab.
          </div>
        )}
        <div className="flex gap-2">
          <Button onClick={() => window.location.reload()} color="zinc" title="Retry fetching from API">
            Retry
          </Button>
          <Button onClick={loadDemo} color="emerald" title="Load a temporary demo state so you can keep building UI">
            Load demo state
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-3 rounded-lg border border-zinc-200 p-3 dark:border-zinc-800" aria-live="polite">
      <div className="flex items-baseline justify-between">
        <Heading>Team Energy & Pillars</Heading>
        <small className="opacity-60" title={new Date(state.ts).toISOString()}>
          last update · {new Date(state.ts).toLocaleString()}
        </small>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-600 dark:text-zinc-300" aria-label="Legend">
        <span className="flex items-center gap-1">
          <span aria-hidden="true">👑</span> crown
        </span>
        <span className="flex items-center gap-1">
          <span aria-hidden="true">🕳️</span> void
        </span>
        <span className="flex items-center gap-1">
          <span aria-hidden="true">🏀</span> play
        </span>
        <span className="flex items-center gap-1">
          <span aria-hidden="true">🐉</span> dragon
        </span>
        <span className="flex items-center gap-1">
          <span aria-hidden="true">⚡️</span> life force
        </span>
        <span className="flex items-center gap-1">
          <span aria-hidden="true">❤️</span> heart (always flowing)
        </span>
        <span className="mx-1 opacity-40">·</span>
        <span className="flex items-center gap-1">
          <span aria-hidden="true">✅</span> GO
        </span>
        <span className="flex items-center gap-1">
          <span aria-hidden="true">⏳</span> WAIT
        </span>
        <span className="flex items-center gap-1">
          <span aria-hidden="true">🛌</span> REST
        </span>
      </div>
      {lastRedirect && (
        <div className="flex items-center gap-2">
          <Badge color="indigo" title={lastRedirect.ts}>
            Last redirect: {lastRedirect.whisper || '—'} → {lastRedirect.doorway || '—'} ({timeAgo(lastRedirect.ts)})
          </Badge>
          <Button
            onClick={landFromRedirect}
            disabled={landing}
            color="zinc"
            title="Insert a gratitude entry from the last redirect"
            aria-busy={landing}
            aria-live="polite">
            {landing ? 'Landing…' : 'Land gratitude'}
          </Button>
        </div>
      )}

      {tells.length > 0 && (
        <div className="text-xs text-zinc-700 dark:text-zinc-300">
          <Subheading>Recent actions</Subheading>
          <div className="flex flex-wrap gap-2">
            {tells.map((t) => (
              <Badge key={t.id} color="zinc">
                <code>{t.node}</code> · {t.action}
                <span className="ml-2 opacity-50">({timeAgo(t.created_at)})</span>
              </Badge>
            ))}
          </div>
        </div>
      )}

      <Divider />
      <div className="flex items-center gap-3" aria-label={`Decision: ${decision.label} – ${decision.detail}`}>
        <Badge color={decision.label === 'GO' ? 'emerald' : decision.label === 'WAIT' ? 'amber' : 'rose'}>
          <span aria-hidden="true" className="mr-1">
            {DECISION_ICON[decision.label as 'GO' | 'WAIT' | 'REST']}
          </span>
          {decision.label}
        </Badge>
        <Strong>
          {decision.detail} · AVG {avg}% · pillars G/W/R {pillarScore.good}/{pillarScore.watch}/{pillarScore.rest}
        </Strong>
      </div>
      <Divider />

      <div className="grid gap-2">
        {state.members.map((m, i) => (
          <div key={m.name} className="grid grid-cols-[120px_1fr_48px] items-center gap-2">
            <Strong className="font-semibold">{m.name}</Strong>
            <Input
              type="range"
              min={0}
              max={100}
              step={1}
              value={m.energy}
              onChange={(e) => mutateMember(i, parseInt((e.target as HTMLInputElement).value))}
              className="w-full"
              aria-label={`${m.name} energy`}
              title={`${m.name} energy: ${m.energy}%`}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={m.energy}
            />
            <Text className="text-right tabular-nums">{m.energy}%</Text>
          </div>
        ))}
      </div>

      <div className="grid gap-2">
        {PILLAR_KEYS.map((k) => (
          <div key={k} className="grid grid-cols-[140px_auto] items-center gap-2">
            <Text className="capitalize">
              <span className="mr-1" aria-hidden="true">
                {PILLAR_ICON[k]}
              </span>
              {k.replace('_', ' ')}
            </Text>
            <fieldset className="m-0 border-0 p-0">
              <legend className="sr-only">{k.replace('_', ' ')} status</legend>
              <div className="flex gap-2" role="radiogroup" aria-label={`${k.replace('_', ' ')} status`}>
                {(['good', 'watch', 'rest'] as const).map((v) => (
                  <button
                    key={v}
                    onClick={() => mutatePillar(k, v)}
                    role="radio"
                    aria-checked={state.pillars[k] === v}
                    aria-pressed={undefined}
                    title={`${k.replace('_', ' ')}: ${v}`}
                    className={`rounded-full border px-2.5 py-1 transition-colors ${
                      state.pillars[k] === v
                        ? v === 'good'
                          ? 'border-emerald-600 bg-emerald-500 text-white hover:bg-emerald-600'
                          : v === 'watch'
                          ? 'border-amber-600 bg-amber-500 text-white hover:bg-amber-600'
                          : 'border-rose-600 bg-rose-500 text-white hover:bg-rose-600'
                        : 'border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-900'
                    }`}>
                    {v}
                  </button>
                ))}
              </div>
            </fieldset>
          </div>
        ))}
        <Text>
          <span className="mr-1" aria-hidden="true">
            ❤️
          </span>
          <span className="text-rose-500 opacity-80">Heart: the background energy, always flowing</span>
        </Text>
      </div>
      <Divider />

      <div className="grid gap-2">
        <Textarea
          rows={4}
          value={state.note || ''}
          onChange={(e) => set({ ...state, note: e.target.value })}
          placeholder="Notes for context (e.g., why we chose WAIT)"
          aria-label="Team note"
          title="Add context for this state"
        />
        <div className="flex gap-2">
          <Button onClick={save} disabled={saving || !isDirty} color="zinc" aria-busy={saving}>
            {saving ? 'Saving…' : 'Save state'}
          </Button>
          <Button
            onClick={async () => set(await getState())}
            plain
            disabled={!isDirty}
            title={isDirty ? 'Reload from API (will discard unsaved edits)' : 'No local changes – nothing to reload'}>
            Reload
          </Button>
        </div>
      </div>
    </div>
  );
}
