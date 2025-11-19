import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { padRegistry$, activePadId$, setActivePadId, dispatchPadOpen, type PadManifest } from '@gratiaos/pad-core';
import { useSignal } from '../shared/useSignal';
import { useMomentum } from './hooks/useMomentum';
import '../../styles/pads.css';

type ShelfEntry = {
  manifest: PadManifest;
  id: string;
  label: string;
  icon: string;
  tone: NonNullable<PadManifest['tone']> | 'accent';
};

const toShelfEntries = (pads: PadManifest[]): ShelfEntry[] =>
  pads.map((pad) => {
    const icon = pad.icon ?? (pad.meta as { icon?: string } | undefined)?.icon ?? '🪴';
    const label = pad.title ?? pad.id;
    return {
      manifest: pad,
      id: pad.id,
      label,
      icon,
      tone: (pad.tone as ShelfEntry['tone']) ?? 'accent',
    };
  });

const THRESH = 28;
const VEL_THRESH = 0.35;
const MAX_SLOPE = 0.58;
const OFFSET_LIMIT = 16;

let shelfPrimedOnce = false;

function haloBurstForSeed(list: React.RefObject<HTMLDivElement | null>, padId: string) {
  const el = list.current?.querySelector<HTMLElement>(`[data-pad-id="${padId}"]`);
  if (!el) return;
  el.setAttribute('data-halo-burst', '');
  window.setTimeout(() => {
    el.removeAttribute('data-halo-burst');
  }, 280);
}

export function PadShelf() {
  const registry = useSignal(padRegistry$, padRegistry$.value ?? []);
  const activeId = useSignal<string | null>(activePadId$, activePadId$.value ?? null);
  const items = useMemo(() => toShelfEntries(registry), [registry]);
  const listRef = useRef<HTMLDivElement | null>(null);
  const { armToBeat } = useMomentum();
  const [dragging, setDragging] = useState(false);
  const draggingRef = useRef(false);
  const drag = useRef({ x: 0, y: 0, t: 0, dx: 0, dy: 0 });
  const lastBurstRef = useRef<string | null>(null);
  const initialBurstSkippedRef = useRef(false);

  const focusIndex = useMemo(() => {
    const idx = items.findIndex((item) => item.id === activeId);
    return idx === -1 ? 0 : idx;
  }, [items, activeId]);

  const activate = useCallback((entry: ShelfEntry, via: 'rail' | 'hotkey') => {
    activePadId$.set(entry.id);
    setActivePadId(entry.id, entry.manifest);
    dispatchPadOpen({ id: entry.id, via });
  }, []);

  const moveFocus = useCallback(
    (delta: number) => {
      if (!items.length) return;
      const next = items[(focusIndex + delta + items.length) % items.length]!;
      activate(next, 'hotkey');
    },
    [items, focusIndex, activate],
  );

  const burstPad = useCallback(
    (padId: string) => {
      haloBurstForSeed(listRef, padId);
      lastBurstRef.current = padId;
    },
    [listRef],
  );

  const slideTo = useCallback(
    (delta: number) => {
      if (!items.length || delta === 0) return;
      const nextIndex = (focusIndex + delta + items.length) % items.length;
      const next = items[nextIndex]!;
      if (next.id === activeId) return;
      armToBeat();
      activate(next, 'rail');
      burstPad(next.id);
    },
    [activate, activeId, armToBeat, burstPad, focusIndex, items],
  );

  useEffect(() => {
    if (items.length === 0) {
      shelfPrimedOnce = false;
      return;
    }

    if (activeId) {
      shelfPrimedOnce = true;
      return;
    }

    if (!shelfPrimedOnce) {
      shelfPrimedOnce = true;
      activate(items[0]!, 'rail');
    }
  }, [items, activeId, activate]);

  useEffect(() => {
    if (!activeId) return;
    const el = listRef.current?.querySelector<HTMLElement>(`[data-pad-id="${activeId}"]`);
    el?.focus();
  }, [activeId]);

  const previousActiveIdRef = useRef<string | null>(activePadId$.value ?? null);

  useEffect(() => {
    let initialEmission = true;
    const unsubscribe = activePadId$.subscribe((id) => {
      if (initialEmission) {
        initialEmission = false;
        previousActiveIdRef.current = id ?? null;
        return;
      }
      if (id === previousActiveIdRef.current) {
        return;
      }
      if (!id) {
        previousActiveIdRef.current = null;
        lastBurstRef.current = null;
        return;
      }
      const previous = previousActiveIdRef.current;
      previousActiveIdRef.current = id;
      if (previous === null && !initialBurstSkippedRef.current) {
        initialBurstSkippedRef.current = true;
        lastBurstRef.current = id;
        return;
      }
      if (lastBurstRef.current === id) {
        lastBurstRef.current = null;
        return;
      }
      burstPad(id);
    });
    return () => {
      unsubscribe();
    };
  }, [burstPad]);

  const onKeyDown: React.KeyboardEventHandler<HTMLDivElement> = (event) => {
    if (draggingRef.current) return;
    if (event.key === 'Enter') {
      event.preventDefault();
      if (!items.length) return;
      const next = items[focusIndex]!;
      if (next.id === activeId) return;
      armToBeat();
      activate(next, 'hotkey');
      burstPad(next.id);
      return;
    }
    if (event.key === 'ArrowDown' || event.key === 'j') {
      event.preventDefault();
      moveFocus(1);
    } else if (event.key === 'ArrowUp' || event.key === 'k') {
      event.preventDefault();
      moveFocus(-1);
    } else if (event.key === 'Home') {
      event.preventDefault();
      if (items.length > 0) activate(items[0]!, 'hotkey');
    } else if (event.key === 'End') {
      event.preventDefault();
      if (items.length > 0) activate(items[items.length - 1]!, 'hotkey');
    }
  };

  useEffect(() => {
    const root = listRef.current;
    if (!root) return;

    const setActiveOffset = (offsetPx: number) => {
      const activeSeed = listRef.current?.querySelector<HTMLElement>('.pad-seed.is-active');
      if (!activeSeed) return;
      activeSeed.style.setProperty('--drag-dx', `${offsetPx}px`);
    };

    const clearActiveOffset = () => {
      const activeSeed = listRef.current?.querySelector<HTMLElement>('.pad-seed.is-active');
      activeSeed?.style.removeProperty('--drag-dx');
    };

    const start = (clientX: number, clientY: number) => {
      draggingRef.current = true;
      setDragging(true);
      drag.current = { x: clientX, y: clientY, t: performance.now(), dx: 0, dy: 0 };
    };

    const move = (clientX: number, clientY: number) => {
      if (!draggingRef.current) return;
      drag.current.dx = clientX - drag.current.x;
      drag.current.dy = clientY - drag.current.y;
      const offset = Math.max(-OFFSET_LIMIT, Math.min(OFFSET_LIMIT, drag.current.dx / 2));
      setActiveOffset(offset);
    };

    const end = () => {
      if (!draggingRef.current) return;
      draggingRef.current = false;

      const { dx, dy, t } = drag.current;
      const dt = Math.max(1, performance.now() - t);
      const slope = Math.abs(dy) / Math.max(1, Math.abs(dx));
      const vel = Math.abs(dx) / dt;

      let delta = 0;
      if (slope <= MAX_SLOPE && (Math.abs(dx) > THRESH || vel > VEL_THRESH)) {
        delta = dx > 0 ? -1 : 1;
      }

      drag.current = { x: 0, y: 0, t: 0, dx: 0, dy: 0 };
      setDragging(false);
      clearActiveOffset();

      if (delta !== 0) {
        slideTo(delta);
      }
    };

    const isSeedTarget = (eventTarget: EventTarget | null) =>
      eventTarget instanceof Element && Boolean(eventTarget.closest('.pad-seed'));

    const onMouseDown = (event: MouseEvent) => {
      if (event.button !== 0) return;
      if (!isSeedTarget(event.target)) return;
      start(event.clientX, event.clientY);
    };

    const onMouseMove = (event: MouseEvent) => {
      move(event.clientX, event.clientY);
    };

    const onMouseUp = () => {
      end();
    };

    const onTouchStart = (event: TouchEvent) => {
      const touch = event.touches[0];
      if (!touch) return;
      if (!isSeedTarget(event.target)) return;
      start(touch.clientX, touch.clientY);
    };

    const onTouchMove = (event: TouchEvent) => {
      if (!draggingRef.current) return;
      const touch = event.touches[0];
      if (!touch) return;
      move(touch.clientX, touch.clientY);
    };

    const onTouchEnd = () => {
      end();
    };

    root.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    root.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('touchend', onTouchEnd);
    window.addEventListener('touchcancel', onTouchEnd);

    return () => {
      draggingRef.current = false;
      clearActiveOffset();
      root.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      root.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
      window.removeEventListener('touchcancel', onTouchEnd);
    };
  }, [slideTo]);

  if (items.length === 0) {
    return (
      <div className="pad-shelf" role="listbox" aria-label="Pads">
        <span className="pad-shelf__empty">Pads warming up…</span>
      </div>
    );
  }

  return (
    <div
      className={`pad-shelf${dragging ? ' is-dragging' : ''}`}
      role="listbox"
      aria-label="Pads"
      aria-activedescendant={activeId ? `pad-seed-${activeId}` : undefined}
      ref={listRef}
      onKeyDown={onKeyDown}
    >
      {items.map((entry) => {
        const isActive = entry.id === activeId;
        return (
          <button
            key={entry.id}
            id={`pad-seed-${entry.id}`}
            role="option"
            type="button"
            className={`pad-seed halo tone-${entry.tone} ${isActive ? 'is-active' : ''}`}
            aria-selected={isActive}
            aria-label={`${entry.label} pad`}
            data-pad-id={entry.id}
            data-halo
            data-halo-active={isActive ? '' : undefined}
            tabIndex={isActive ? 0 : -1}
            onClick={() => {
              if (isActive) return;
              armToBeat();
              activate(entry, 'rail');
              burstPad(entry.id);
            }}
          >
            <span className="seed-dot icon" aria-hidden="true">
              {entry.icon}
            </span>
            <span className="seed-label label">{entry.label}</span>
          </button>
        );
      })}
    </div>
  );
}
