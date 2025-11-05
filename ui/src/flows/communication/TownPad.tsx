import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Card, Pill, Field } from '@gratiaos/ui';
import { DEFAULT_TOWN, getTownBulletin, postTownNews } from '@/api';
import { showToast } from '@gratiaos/ui';
import { flattenBulletinPayload, type TownBulletinItem } from '@/utils/town';
// pad-visuals removed — keep simple local mappings per kind
import { dispatchPadBulletinUpdated, padEvents, type PadMood } from '@gratiaos/pad-core';

type TownPadProps = {
  me: string;
};

type BulletinItem = TownBulletinItem;

const KIND_OPTIONS = [
  { id: 'news' as const, icon: '🗞️' },
  { id: 'alert' as const, icon: '⚡' },
  { id: 'note' as const, icon: '📝' },
] as const;

const KIND_MOOD: Record<(typeof KIND_OPTIONS)[number]['id'], PadMood> = {
  news: 'soft',
  alert: 'focused',
  note: 'celebratory',
};

function formatTimestamp(ts: string) {
  try {
    const date = new Date(ts);
    return new Intl.DateTimeFormat(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  } catch {
    return ts;
  }
}

const TownPad: React.FC<TownPadProps> = ({ me }) => {
  const [town, setTown] = useState(DEFAULT_TOWN);
  const [voiceSpecies, setVoiceSpecies] = useState<'cat' | 'human' | 'system'>('cat');
  const [voiceName, setVoiceName] = useState(() => (me ? me.toLowerCase().replace(/\s+/g, '_') : 'all'));
  const [kind, setKind] = useState<BulletinItem['kind']>('news');
  const [message, setMessage] = useState('');
  const [bulletin, setBulletin] = useState<BulletinItem[]>([]);
  const [loadingBulletin, setLoadingBulletin] = useState(false);
  const [posting, setPosting] = useState(false);
  const [scheduleMode, setScheduleMode] = useState<'now' | 'soon'>('now');
  const activeOption = useMemo(() => KIND_OPTIONS.find((opt) => opt.id === kind) ?? KIND_OPTIONS[0], [kind]);
  const pillTone = useMemo(() => ({ news: 'accent', alert: 'danger', note: 'subtle' }[kind] ?? 'subtle'), [kind]);
  const kindLabel = useMemo(() => ({ news: 'News', alert: 'Signal', note: 'Note' }[kind] ?? 'Note'), [kind]);
  const kindNote = useMemo(
    () => ({ news: 'gentle updates ripple out', alert: 'heightened pulse — breathe first', note: 'soft reflection carried along' }[kind] ?? ''),
    [kind]
  );

  const voicePreview = useMemo(() => {
    const trimmed = voiceName.trim();
    if (trimmed.includes(':')) return trimmed;
    const fallback = trimmed || (voiceSpecies === 'cat' ? 'all' : me?.toLowerCase().replace(/\s+/g, '_') ?? 'me');
    return `${voiceSpecies}:${fallback}`;
  }, [voiceName, voiceSpecies, me]);

  useEffect(() => {
    if (voiceSpecies === 'human') {
      const next = (me || voiceName || 'me').toLowerCase().replace(/\s+/g, '_');
      setVoiceName((prev) => (prev ? prev : next));
    } else if (voiceSpecies === 'cat' && !voiceName) {
      setVoiceName('all');
    }
  }, [voiceSpecies, me]);

  const refreshBulletin = useCallback(async () => {
    try {
      setLoadingBulletin(true);
      const payload = await getTownBulletin({ town, limit: 20 }).catch(() => undefined);
      const items = flattenBulletinPayload(payload, town);
      setBulletin(items);
      dispatchPadBulletinUpdated({ padId: 'towns', topic: town });
    } finally {
      setLoadingBulletin(false);
    }
  }, [town]);

  const publishNews = useCallback(async () => {
    const trimmedMessage = message.trim();
    if (!trimmedMessage) {
      showToast({
        title: 'Add a whisper first',
        desc: 'Town notes stay light but need a line of meaning.',
        icon: '🌬️',
        variant: 'warning',
      });
      return;
    }

    const trimmedTown = town.trim() || DEFAULT_TOWN;
    const voice = voicePreview;

    setPosting(true);
    try {
      await postTownNews({
        town: trimmedTown,
        headline: trimmedMessage,
        who: voice,
        note: kind,
      });
      setMessage('');
      showToast({
        title: 'Whisper posted',
        desc: `${trimmedTown} · ${kindLabel}`,
        icon: activeOption.icon,
        variant: 'positive',
      });
      setTimeout(() => {
        void refreshBulletin();
      }, 120);
    } catch (error) {
      console.error(error);
      showToast({
        title: 'Town pad is resting',
        desc: `${trimmedTown} · ${kindLabel}`,
        icon: '💤',
        variant: 'warning',
      });
    } finally {
      setPosting(false);
    }
  }, [message, town, voicePreview, kind, activeOption.icon, kindLabel, refreshBulletin]);

  useEffect(() => {
    void refreshBulletin();
  }, [refreshBulletin]);

  useEffect(() => {
    const mood = KIND_MOOD[kind] ?? 'soft';
    padEvents.send({ type: 'PAD.MOOD.SET', mood });
  }, [kind]);

  useEffect(() => {
    const id = setInterval(() => {
      if (!document.hidden) void refreshBulletin();
    }, 15_000);
    return () => clearInterval(id);
  }, [refreshBulletin]);

  return (
    <div className="group relative" data-ui="town-pad" data-whisper="town-pad">
      {/* ambient aura removed with pad-visuals */}
      <div
        className="pointer-events-none absolute inset-0 rounded-3xl border border-white/5 group-hover:border-[var(--color-accent)]/35 transition-colors duration-500"
        aria-hidden
      />
      <Card className="relative z-10 flex flex-col gap-6 rounded-3xl border border-border/50 bg-surface/85 p-6 shadow-[0_30px_80px_-45px_rgba(14,116,144,0.65)] backdrop-blur-sm">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold tracking-tight text-text">Town Pad</h2>
            <p className="text-sm text-subtle">Soft bulletins for species and neighborhoods — a whisper interface that listens back.</p>
            <p className="flex items-center gap-2 text-xs text-subtle/80">
              <span aria-hidden>🌬️</span>
              <span>{kindNote}</span>
            </p>
          </div>
          <Pill tone={pillTone as any} variant="outline" density="snug">
            {town || DEFAULT_TOWN}
          </Pill>
        </header>

        <section className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
          <div className="grid gap-4">
            <Field
              label={
                <span className="flex items-center gap-2 text-subtle">
                  <span aria-hidden>{activeOption.icon}</span>
                  <span>Message</span>
                </span>
              }
              description="Share one clear line. Frequency-first keeps this pad light; ⌘⏎ publishes, R refreshes, Esc blurs.">
              {(aria) => (
                <textarea
                  {...aria}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'enter') {
                      e.preventDefault();
                      void publishNews();
                    } else if (!e.metaKey && !e.ctrlKey && e.key.toLowerCase() === 'r') {
                      e.preventDefault();
                      void refreshBulletin();
                    } else if (e.key === 'Escape') {
                      (document.activeElement as HTMLElement | null)?.blur();
                    }
                  }}
                  placeholder="“Sunbeam shifts to the couch at 14:00.”"
                  rows={4}
                  className="input-base w-full"
                />
              )}
            </Field>
            <form
              className="flex flex-wrap items-center gap-3"
              onSubmit={(e) => {
                e.preventDefault();
                void publishNews();
              }}>
              <Button type="submit" tone="accent" disabled={posting || !message.trim()}>
                {posting ? 'Publishing…' : 'Publish whisper'}
              </Button>
              <Button type="button" variant="ghost" onClick={() => void refreshBulletin()} disabled={loadingBulletin}>
                {loadingBulletin ? 'Refreshing…' : 'Refresh'}
              </Button>
              <span className="text-xs text-subtle/80">CatTown defaults; shift towns to direct where the whisper lands.</span>
            </form>
          </div>

          <aside className="grid gap-4 rounded-2xl border border-border/40 bg-surface/70 p-4 text-sm">
            <Field label="Town">
              {(aria) => (
                <input
                  {...aria}
                  value={town}
                  onChange={(e) => setTown(e.target.value)}
                  placeholder="CatTown"
                  className="w-full input-base"
                  type="text"
                />
              )}
            </Field>

            <div className="grid gap-2">
              <Field label="Voice" description={`Stored as ${voicePreview}`}>
                {(aria) => (
                  <input
                    {...aria}
                    value={voiceName}
                    onChange={(e) => setVoiceName(e.target.value)}
                    placeholder={voiceSpecies === 'cat' ? 'felix' : voiceSpecies === 'human' ? 'raz' : 'bridge'}
                    className="w-full input-base"
                    type="text"
                  />
                )}
              </Field>
              <div className="flex flex-wrap gap-2">
                {(['cat', 'human', 'system'] as const).map((species) => (
                  <Pill
                    key={species}
                    as="button"
                    tone={voiceSpecies === species ? 'accent' : 'subtle'}
                    variant={voiceSpecies === species ? 'solid' : 'soft'}
                    onClick={() => setVoiceSpecies(species)}>
                    {species === 'cat' ? 'Cat' : species === 'human' ? 'Human' : 'System'}
                  </Pill>
                ))}
              </div>
            </div>

            <div className="grid gap-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-subtle/80">Mood</span>
              <div className="flex flex-wrap gap-2">
                {KIND_OPTIONS.map((option) => {
                  const tone = option.id === 'alert' ? 'danger' : option.id === 'news' ? 'accent' : 'subtle';
                  const label = option.id === 'alert' ? 'Signal' : option.id === 'news' ? 'News' : 'Note';
                  return (
                    <Pill
                      key={option.id}
                      as="button"
                      tone={kind === option.id ? (tone as any) : 'subtle'}
                      variant={kind === option.id ? 'solid' : 'soft'}
                      onClick={() => setKind(option.id)}
                      leading={
                        <span aria-hidden className="text-base leading-none">
                          {option.icon}
                        </span>
                      }>
                      {label}
                    </Pill>
                  );
                })}
              </div>
              <span className="text-xs text-subtle/70">{kindNote}</span>
            </div>

            <Field label="Schedule (optional)">
              {(aria) => (
                <select
                  {...aria}
                  value={scheduleMode}
                  onChange={(e) => {
                    const value = (e.target.value as 'now' | 'soon') ?? 'now';
                    if (value === 'soon') {
                      showToast({
                        title: 'Scheduler not wired yet',
                        desc: 'For now, publish in the moment.',
                        icon: '⌛',
                        variant: 'neutral',
                      });
                      setScheduleMode('now');
                      return;
                    }
                    setScheduleMode(value);
                  }}
                  className="w-full input-base">
                  <option value="now">Send immediately</option>
                  <option value="soon">Schedule whisper (coming soon)</option>
                </select>
              )}
            </Field>
          </aside>
        </section>

        <section className="grid gap-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-subtle">Bulletin</h3>
            <span className="text-xs text-subtle/70">{bulletin.length} whispers stored locally</span>
          </div>
          <div className="grid gap-3">
            {bulletin.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border/60 bg-surface/60 p-6 text-sm text-subtle">
                {loadingBulletin ? 'Listening for the latest whispers…' : 'No whispers yet — be the first to share.'}
              </div>
            ) : (
              bulletin.map((item) => (
                <article
                  key={item.id}
                  className="group/bulletin relative overflow-hidden rounded-2xl border border-border/50 bg-surface/80 p-4 transition hover:border-[var(--color-accent)]/50">
                  {/* decorative gradient removed with pad-visuals */}
                  <div className="relative flex flex-wrap items-center justify-between gap-2 text-xs text-subtle">
                    <div className="flex items-center gap-2">
                      <Pill tone={(item.kind === 'alert' ? 'danger' : item.kind === 'news' ? 'accent' : 'subtle') as any} variant="soft" density="snug">
                        {item.kind === 'alert' ? 'Signal' : item.kind === 'news' ? 'News' : 'Note'}
                      </Pill>
                      <span className="text-subtle/70">{item.town}</span>
                      <Pill tone="subtle" variant="soft" density="snug">
                        {item.speaker.species}:{item.speaker.name}
                      </Pill>
                    </div>
                    <span className="text-subtle/60">{formatTimestamp(item.ts)}</span>
                  </div>
                  <p className="relative mt-3 text-sm text-text">{item.text || '—'}</p>
                  <p className="relative mt-2 text-xs text-subtle/75">by {item.speaker.name}</p>
                </article>
              ))
            )}
          </div>
        </section>
      </Card>
    </div>
  );
};

export default TownPad;
