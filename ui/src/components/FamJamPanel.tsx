import * as React from 'react';
import { Button, Card, Pill } from '@garden/ui';
import { notify } from '@/utils/joy';
import { Heart, Sparkles, Leaf } from '@garden/icons';

type Actor = 'me' | 'n' | 's' | 'all';

const ACTORS: Record<Exclude<Actor, 'all'>, { label: string; emoji: string }> = {
  me: { label: 'Me', emoji: '🙂' },
  n: { label: 'N', emoji: '🧒' },
  s: { label: 'S', emoji: '🌿' },
};

const ROOMS = [
  { id: 'all', label: 'All (shared field)', emoji: '✨' },
  { id: 'me', label: 'Me', emoji: '🙂' },
  { id: 'n', label: 'N', emoji: '🧒' },
  { id: 's', label: 'S', emoji: '🌿' },
] as const;

export function FamJamPanel() {
  const [actor, setActor] = React.useState<Actor>('me');
  const [room, setRoom] = React.useState<(typeof ROOMS)[number]['id']>('all');
  const [note, setNote] = React.useState('');

  const toastInfo = (msg: string) => notify(msg, 'info');
  const toastSuccess = (msg: string) => notify(msg, 'success');
  const toastWarn = (msg: string) => notify(msg, 'warning');

  const actorLabel = actor === 'all' ? 'All' : `${ACTORS[actor as Exclude<Actor, 'all'>].emoji} ${ACTORS[actor as Exclude<Actor, 'all'>].label}`;

  function handleOpenJam() {
    toastInfo(`Jam opened in “${room.toUpperCase()}” as ${actorLabel}`);
  }

  function handlePingLove() {
    toastSuccess(`Love ping sent to ${room === 'all' ? 'the shared field' : room.toUpperCase()}`);
  }

  function handleShareNote() {
    if (!note.trim()) return toastWarn('Add a tiny note first');
    // (v0: local toast; v1: POST to M3 bridge)
    toastSuccess(`Shared: “${note.trim()}”`);
    setNote('');
  }

  return (
    <Card className="max-w-3xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Fam Jam</h2>
          <p className="text-sm text-[var(--color-subtle)]">One field, three hearts — quick pulses and presence.</p>
        </div>
        <Leaf aria-hidden className="text-[var(--color-accent)]" />
      </div>

      {/* Actor select */}
      <section className="mt-5 space-y-2">
        <h3 className="text-sm font-medium text-[var(--color-subtle)]">I’m speaking as</h3>
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
        <h3 className="text-sm font-medium text-[var(--color-subtle)]">Jam room</h3>
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
        <h3 className="text-sm font-medium text-[var(--color-subtle)]">Tiny note (optional)</h3>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="One sentence is enough. What’s here now?"
          className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-elev)] p-3 text-sm outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
          rows={3}
        />
      </section>

      {/* Controls */}
      <div className="mt-5 flex flex-wrap items-center gap-2">
        <Button tone="accent" onClick={handleOpenJam} leadingIcon={<Sparkles aria-hidden size={18} />}>
          Open Jam
        </Button>
        <Button variant="outline" tone="positive" onClick={handlePingLove} leadingIcon={<Heart aria-hidden size={18} />}>
          Ping Love
        </Button>
        <Button variant="ghost" onClick={handleShareNote}>
          Share Note
        </Button>
      </div>

      {/* Footer hint */}
      <p className="mt-4 text-xs text-[var(--color-subtle)]">
        Voice + timeline come next; for now this is a gentle surface to sync attention and send micro-blessings.
      </p>
    </Card>
  );
}
