import React, { useEffect, type CSSProperties } from 'react';
import { Card, Button, Badge, showToast } from '@gratiaos/ui';
import { useSignal, useSignalManySelector, shallowEqual } from '@/lib/useSignal';
import { myBreath$, theirBreath$, coReg$, opened$, pressStart, pressEnd, markBreathTheirs } from '@/flows/games/breathGame';
import { createGratitudeToken } from '@/flows/value/gratitudeTokens';
import { mood$ } from '@gratiaos/presence-kernel';
import { useProfile } from '@/state/profile';
import { spiritHue$, nudgeSpiritHue } from '@/flows/games/spiritChord';
import { startTrace, stopTrace, clearTrace, trace$ } from '@/flows/games/traceRecorder';
import { playTraceGhost, stopTraceGhost } from '@/flows/games/traceGhost';
import { broadcaster } from '@/lib/gardenBroadcaster';

const selectHarmony = (values: readonly unknown[]) => ({
  co: values[0] as string,
  open: Boolean(values[1]),
});

const label = (state: string) => state.charAt(0).toUpperCase() + state.slice(1);

export function CoBreathScene() {
  const { me } = useProfile();
  const mine = useSignal(myBreath$);
  const theirs = useSignal(theirBreath$);
  const { co, open } = useSignalManySelector([coReg$, opened$], selectHarmony, shallowEqual);
  const spiritHue = useSignal(spiritHue$);
  const trace = useSignal(trace$);

  useEffect(() => {
    if (co === 'together') {
      nudgeSpiritHue(8, 1400);
    }
  }, [co]);

  useEffect(() => {
    const handleDown = (event: KeyboardEvent) => {
      if (event.code !== 'Space') return;
      event.preventDefault();
      pressStart();
    };
    const handleUp = (event: KeyboardEvent) => {
      if (event.code !== 'Space') return;
      event.preventDefault();
      pressEnd();
    };
    window.addEventListener('keydown', handleDown);
    window.addEventListener('keyup', handleUp);
    return () => {
      window.removeEventListener('keydown', handleDown);
      window.removeEventListener('keyup', handleUp);
    };
  }, []);

  useEffect(() => {
    const onOpened = () => {
      showToast({
        icon: '🫧',
        title: 'Together',
        desc: 'Breath gate opened.',
        variant: 'positive',
      });
      createGratitudeToken({
        from: me ?? 'local-user',
        message: 'Thank you for meeting my breath.',
        scene: 'Co-Breath',
        resonance: (mood$ as { value?: string }).value,
      });
    };
    window.addEventListener('game:breath:opened', onOpened);
    return () => window.removeEventListener('game:breath:opened', onOpened);
  }, [me]);

  const latestEvent = trace[trace.length - 1];
  const timelineDots =
    latestEvent && latestEvent.t > 0
      ? trace.map((event, index) => (
          <div
            key={`${event.t}-${index}`}
            className="trace-dot"
            style={{
              left: `${(event.t / latestEvent.t) * 100}%`,
              backgroundColor: `hsl(${event.hue}deg 60% 55%)`,
            }}
          />
        ))
      : null;

  useEffect(
    () => () => {
      stopTrace();
      stopTraceGhost();
    },
    []
  );

  useEffect(() => {
    if (typeof window === 'undefined' || !broadcaster.hasChannel) return;
    let alive = true;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const tick = () => {
      if (!alive) return;
      if (typeof document === 'undefined' || document.visibilityState === 'visible') {
        broadcaster.mirrorBreath({
          stage: myBreath$.value,
          hue: spiritHue$.value,
        });
      }
      timer = window.setTimeout(tick, 250);
    };
    timer = window.setTimeout(tick, 250);
    return () => {
      alive = false;
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, []);

  return (
    <Card>
      <div data-ui="cobreath">
        <header className="flex items-center gap-2">
          <h2 className="text-xl font-semibold text-text">Co-Breath</h2>
          <Badge variant="subtle">{label(co)}</Badge>
          {open ? (
            <Badge variant="solid" tone="positive">
              Open
            </Badge>
          ) : null}
        </header>

        <div className="harmony-ribbon" data-state={co} style={{ '--ribbon-h': `${spiritHue}` } as CSSProperties} />

        <p className="text-sm text-muted">Press and hold to inhale, release to exhale. Drift just softens the ring—nothing fails.</p>

        <div
          data-ui="cobreath-ring"
          data-coreg={co}
          data-mine={mine}
          data-theirs={theirs}
          style={{ '--spirit-hue': `${spiritHue}deg` } as CSSProperties}
          tabIndex={0}
          aria-label="Breath ring. Press and hold to inhale; release to exhale."
          onPointerDown={(event) => {
            (event.target as HTMLElement | null)?.setPointerCapture?.(event.pointerId);
            pressStart();
          }}
          onPointerUp={pressEnd}
          onPointerCancel={pressEnd}
          onPointerLeave={pressEnd}>
          <div className="ring" />
          <div className={`dot me ${mine}`} aria-hidden />
          <div className={`dot them ${theirs}`} aria-hidden />
        </div>

        <div className="flex gap-2">
          <Button variant="ghost" onClick={() => markBreathTheirs('inhale')}>
            Signal: them inhale
          </Button>
          <Button variant="ghost" onClick={() => markBreathTheirs('exhale')}>
            Signal: them exhale
          </Button>
        </div>

        <div className="trace-bar space-y-2">
          <div className="timeline" aria-hidden>
            {timelineDots}
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button variant="subtle" onClick={startTrace}>
              Record
            </Button>
            <Button variant="subtle" onClick={stopTrace}>
              Stop
            </Button>
            <Button tone="accent" onClick={playTraceGhost}>
              Replay
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                stopTraceGhost();
                clearTrace();
                markBreathTheirs('hold');
              }}>
              Clear
            </Button>
          </div>
        </div>

        <p className="text-subtle text-sm">Tip: The spacebar mirrors the press-and-hold.</p>
      </div>
    </Card>
  );
}
