import * as React from 'react';
import { Button, Card, Pill } from '@gratiaos/ui';
import { Heart, Sparkles, Leaf } from '@gratiaos/icons';
import { notify } from '@/utils/joy';

// local persistence helper (simple, no SSR issues assumed here)
function useStickyState<T>(key: string, initial: T) {
  const [value, setValue] = React.useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : initial;
    } catch {
      return initial;
    }
  });
  React.useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {}
  }, [key, value]);
  return [value, setValue] as const;
}

type Actor = 'me' | 'n' | 's' | 'all';

const ACTORS: Record<Exclude<Actor, 'all'>, { label: string; emoji: string }> = {
  me: { label: 'Me', emoji: '🙂' },
  n: { label: 'N', emoji: '🧒' },
  s: { label: 'S', emoji: '🌿' },
};

const ROOMS = [
  { id: 'car', label: 'Car', emoji: '🚗' },
  { id: 'kitchen', label: 'Kitchen', emoji: '🍳' },
  { id: 'firecircle', label: 'Firecircle', emoji: '🔥' },
  { id: 'anywhere', label: 'Anywhere', emoji: '✨' },
] as const;

const FamJamPad: React.FC = () => {
  const [actor, setActor] = useStickyState<Actor>('famjam:actor', 'me');
  const [room, setRoom] = useStickyState<(typeof ROOMS)[number]['id']>('famjam:room', 'anywhere');
  const [note, setNote] = React.useState('');

  const toastInfo = (msg: string) => notify(msg, 'info');
  const toastSuccess = (msg: string) => notify(msg, 'success');
  const toastWarn = (msg: string) => notify(msg, 'warning');

  const actorLabel = actor === 'all' ? 'All' : `${ACTORS[actor as Exclude<Actor, 'all'>].emoji} ${ACTORS[actor as Exclude<Actor, 'all'>].label}`;
  const roomLabel = React.useMemo(() => ROOMS.find((r) => r.id === room)?.label ?? String(room), [room]);

  function handleOpenJam() {
    toastInfo(`Jam opened in “${roomLabel}” as ${actorLabel}`);
    // bridge a lightweight timeline entry (open)
    window.dispatchEvent(
      new CustomEvent('timeline:add', {
        detail: {
          t: Date.now(),
          source: 'bridge',
          kind: 'famjam_open',
          intensity: 0.2,
          hint: `room:${room} as ${actorLabel}`,
          anchor: actor === 'all' ? 'Shared field' : `Actor:${actor}`,
          doorway: room,
        },
      })
    );
  }

  function handleCloseJam() {
    toastWarn(`Jam closed in “${roomLabel}”`);
    window.dispatchEvent(
      new CustomEvent('timeline:add', {
        detail: {
          t: Date.now(),
          source: 'bridge',
          kind: 'famjam_close',
          intensity: 0.2,
          hint: `room:${room} as ${actorLabel}`,
          anchor: actor === 'all' ? 'Shared field' : `Actor:${actor}`,
          doorway: room,
        },
      })
    );
  }

  function handlePingLove() {
    toastSuccess(`Love ping sent to ${roomLabel}`);
  }

  function handleShareNote() {
    const trimmed = note.trim();
    if (!trimmed) return toastWarn('Add a tiny note first');
    // v0: local toast; v1: POST to M3 bridge
    toastSuccess(`Shared: “${trimmed}”`);

    // bridge to timeline so it shows up immediately
    window.dispatchEvent(
      new CustomEvent('timeline:add', {
        detail: {
          t: Date.now(),
          source: 'bridge',
          kind: 'famjam_note',
          intensity: 0.4,
          hint: trimmed,
          anchor: actor === 'all' ? 'Shared field' : `Actor:${actor}`,
          doorway: room,
        },
      })
    );

    setNote('');
  }

  return (
    <Card className="max-w-3xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Fam Jam</h2>
          <p className="text-sm text-subtle">One field, three hearts — quick pulses and presence.</p>
        </div>
        <Leaf aria-hidden className="text-[var(--color-accent)]" />
      </div>

      {/* Actor select */}
      <section className="mt-5 space-y-2">
        <h3 className="text-sm font-medium text-subtle">I’m speaking as</h3>
        <div className="flex flex-wrap gap-2">
          {(['me', 'n', 's'] as const).map((id) => {
            const a = ACTORS[id];
            const selected = actor === id;
            return (
              <Pill
                key={id}
                as="button"
                tone={selected ? 'accent' : 'subtle'}
                variant={selected ? 'solid' : 'soft'}
                onClick={() => setActor(id)}
                leading={
                  <span aria-hidden className="text-base leading-none">
                    {a.emoji}
                  </span>
                }>
                {a.label}
              </Pill>
            );
          })}
          {/* “All” is a special actor mode */}
          <Pill
            as="button"
            tone={actor === 'all' ? 'positive' : 'subtle'}
            variant={actor === 'all' ? 'solid' : 'soft'}
            onClick={() => setActor('all')}
            leading={<Sparkles aria-hidden size={16} />}>
            All
          </Pill>
        </div>
      </section>

      {/* Room select */}
      <section className="mt-5 space-y-2">
        <h3 className="text-sm font-medium text-subtle">Jam room</h3>
        <div className="flex flex-wrap gap-2">
          {ROOMS.map((r) => (
            <Pill
              key={r.id}
              as="button"
              tone={room === r.id ? 'accent' : 'subtle'}
              variant={room === r.id ? 'outline' : 'soft'}
              onClick={() => setRoom(r.id as any)}
              leading={
                <span aria-hidden className="text-base leading-none">
                  {r.emoji}
                </span>
              }>
              {r.label}
            </Pill>
          ))}
        </div>
      </section>

      {/* Note / pulse */}
      <section className="mt-5 space-y-2">
        <h3 className="text-sm font-medium text-subtle">Tiny note (optional)</h3>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
              e.preventDefault();
              handleShareNote();
            }
          }}
          placeholder="One sentence is enough. What’s here now?"
          className="w-full rounded-lg border border-border bg-elev p-3 text-sm outline-none focus:ring-2 focus:ring-[var(--color-accent)] halo"
          data-halo
          rows={3}
        />
      </section>

      {/* Controls */}
      <div className="mt-5 flex flex-wrap items-center gap-2">
        <Button tone="accent" onClick={handleOpenJam} leadingIcon={<Sparkles aria-hidden size={18} />}>
          Open Jam
        </Button>
        <Button variant="outline" tone="warning" onClick={handleCloseJam} leadingIcon={<span aria-hidden>🧯</span>}>
          Close Jam
        </Button>
        <Button variant="outline" tone="positive" onClick={handlePingLove} leadingIcon={<Heart aria-hidden size={18} />}>
          Ping Love
        </Button>
        <Button variant="ghost" onClick={handleShareNote} disabled={!note.trim()}>
          Share Note
        </Button>
      </div>

      {/* Footer hint */}
      <p className="mt-4 text-xs text-subtle">
        Voice + timeline come next; for now this is a gentle surface to sync attention and send micro-blessings. Press ⌘/Ctrl + Enter to share
        quickly.
      </p>
    </Card>
  );
};

export default FamJamPad;
