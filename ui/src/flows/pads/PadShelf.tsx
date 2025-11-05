import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { padRegistry$, activePadId$, setActivePadId, dispatchPadOpen, type PadManifest } from '@gratiaos/pad-core';
import { useSignal } from '../shared/useSignal';
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

export function PadShelf() {
  const registry = useSignal(padRegistry$, padRegistry$.value ?? []);
  const activeId = useSignal<string | null>(activePadId$, activePadId$.value ?? null);
  const items = useMemo(() => toShelfEntries(registry), [registry]);
  const listRef = useRef<HTMLDivElement>(null);

  const focusIndex = useMemo(() => {
    const idx = items.findIndex((item) => item.id === activeId);
    return idx === -1 ? 0 : idx;
  }, [items, activeId]);

  const activate = useCallback((entry: ShelfEntry, via: 'rail' | 'hotkey') => {
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

  useEffect(() => {
    if (items.length === 0) return;
    if (!activeId) {
      activate(items[0]!, 'rail');
    }
  }, [items, activeId, activate]);

  useEffect(() => {
    if (!activeId) return;
    const el = listRef.current?.querySelector<HTMLElement>(`[data-pad-id="${activeId}"]`);
    el?.focus();
  }, [activeId]);

  const onKeyDown: React.KeyboardEventHandler<HTMLDivElement> = (event) => {
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

  if (items.length === 0) {
    return (
      <div className="pad-shelf" role="listbox" aria-label="Pads">
        <span className="pad-shelf__empty">Pads warming up…</span>
      </div>
    );
  }

  return (
    <div
      className="pad-shelf"
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
            className={`pad-seed tone-${entry.tone} ${isActive ? 'is-active' : ''}`}
            aria-selected={isActive}
            aria-label={`${entry.label} pad`}
            data-pad-id={entry.id}
            tabIndex={isActive ? 0 : -1}
            onClick={() => activate(entry, 'rail')}
          >
            <span className="seed-dot" aria-hidden="true">
              {entry.icon}
            </span>
            <span className="seed-label">{entry.label}</span>
          </button>
        );
      })}
    </div>
  );
}
