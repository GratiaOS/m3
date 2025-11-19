import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { announce } from '@/lib/srAnnouncer';
import { spiritHue$ } from '@/flows/games/spiritChord';
import { useSignal } from '@/lib/useSignal';
import { matchesChord } from '@/lib/hotkeys';
import { chordAttr } from '@/lib/chordUi';

type Chip = {
  id: string;
  label: string;
  selected: boolean;
};

const defaultLines = {
  thank: 'Mulțumesc, Mamă/Gaia, pentru iubirea pe care mi-ai dat-o când eram mic și bolnav.',
  returnTake: 'Îți returnez ce e al tău: inocența; îmi iau înapoi ce e al meu: inocența.',
  hold: 'Îmi țin copilul din mine: sunt aici, respir, am loc.',
};

const chipPresets: Chip[] = [{ id: 'innocence', label: 'Inocență', selected: true }];

const createDefaultChips = () => chipPresets.map((chip) => ({ ...chip }));

const dispatchSeal = (text: string) => {
  const trimmed = text.trim();
  if (!trimmed) return;
  const target =
    typeof document !== 'undefined'
      ? document
      : typeof window !== 'undefined'
      ? window
      : null;
  target?.dispatchEvent(
    new CustomEvent('codex:seal', {
      detail: {
        text: trimmed,
        at: Date.now(),
      },
    })
  );
};

type SceneStyle = React.CSSProperties & { '--spirit-hue'?: string };

export function MotherlineScene() {
  const [thank, setThank] = useState(defaultLines.thank);
  const [returnTake, setReturnTake] = useState(defaultLines.returnTake);
  const [hold, setHold] = useState(defaultLines.hold);
  const [chips, setChips] = useState<Chip[]>(createDefaultChips);
  const hue = useSignal(spiritHue$);

  const canSeal = useMemo(() => {
    return Boolean(thank.trim() || returnTake.trim() || hold.trim());
  }, [thank, returnTake, hold]);

  const selectedTags = useMemo(() => chips.filter((chip) => chip.selected).map((chip) => chip.label), [chips]);

  const onSeal = useCallback(() => {
    if (!canSeal) return;
    const tagSuffix = selectedTags.length ? ` · ${selectedTags.join(' · ')}` : '';
    const suffix = `${tagSuffix}${tagSuffix ? ' ' : ''}#motherline`;
    if (thank.trim()) dispatchSeal(`${thank.trim()}${suffix}`);
    if (returnTake.trim()) dispatchSeal(`${returnTake.trim()}${suffix}`);
    if (hold.trim()) dispatchSeal(`${hold.trim()}${suffix}`);
    announce('Motherline sealed.');
  }, [canSeal, hold, returnTake, selectedTags, thank]);

  const onClear = useCallback(() => {
    setThank(defaultLines.thank);
    setReturnTake(defaultLines.returnTake);
    setHold(defaultLines.hold);
    setChips(createDefaultChips());
  }, []);

  const toggleChip = useCallback((id: string) => {
    setChips((current) =>
      current.map((chip) => (chip.id === id ? { ...chip, selected: !chip.selected } : chip))
    );
  }, []);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (matchesChord(event, 'sealMotherline', { allowEditable: true }) && canSeal) {
        event.preventDefault();
        onSeal();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [canSeal, onSeal]);

  const sceneStyle: SceneStyle | undefined =
    typeof hue === 'number' ? ({ '--spirit-hue': `${hue}deg` } as SceneStyle) : undefined;

  return (
    <section className="motherline pad-deck" style={sceneStyle}>
      <header className="motherline-head">
        <div>
          <p className="scene-sub">Motherline</p>
          <p className="scene-hint">Respiră, scrie, sigilează. Inocență preselectată.</p>
        </div>
        <div className="chip-group" role="listbox" aria-label="Motherline chips">
          {chips.map((chip) => (
            <button
              key={chip.id}
              type="button"
              className={`chip ${chip.selected ? 'is-selected' : ''}`}
              onClick={() => toggleChip(chip.id)}
              aria-pressed={chip.selected}>
              {chip.label}
            </button>
          ))}
        </div>
      </header>

      <div className="motherline-grid">
        <label className="ml-field">
          <span className="ml-label">Mulțumire</span>
          <textarea
            className="codex-portal"
            rows={2}
            aria-label="Mulțumire"
            value={thank}
            onChange={(event) => setThank(event.target.value)}
            placeholder="Mulțumesc, Mamă/Gaia…"
          />
        </label>

        <label className="ml-field">
          <span className="ml-label">Îți returnez / Îmi iau înapoi</span>
          <textarea
            className="codex-portal"
            rows={2}
            aria-label="Returnez și îmi iau înapoi"
            value={returnTake}
            onChange={(event) => setReturnTake(event.target.value)}
            placeholder="Îți returnez… îmi iau înapoi…"
          />
        </label>

        <label className="ml-field">
          <span className="ml-label">Țin copilul din mine</span>
          <textarea
            className="codex-portal"
            rows={2}
            aria-label="Țin copilul din mine"
            value={hold}
            onChange={(event) => setHold(event.target.value)}
            placeholder="Sunt aici, respir, am loc."
          />
        </label>
      </div>

      <footer className="motherline-controls">
        <button type="button" className="hk-secondary" onClick={onClear}>
          Reset
        </button>
        <div className="spacer" />
        <button
          type="button"
          className="seal"
          onClick={onSeal}
          disabled={!canSeal}
          aria-disabled={!canSeal}
          {...chordAttr('sealMotherline')}>
          Seal
        </button>
      </footer>
    </section>
  );
}
