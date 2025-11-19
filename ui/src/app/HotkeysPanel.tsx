import React, { useEffect } from 'react';
import { useHotkeysOpen, setHotkeysOpen, toggleHotkeysOpen } from '@/lib/uiSignals';
import { chordAttr, chordTitle } from '@/lib/chordUi';
import type { ChordAction } from '@/lib/keyChords';

const ROWS: Array<{ action: ChordAction; label: string; scope: string }> = [
  { action: 'memoryToggle', label: 'Memory (consent) — toggle', scope: 'Global' },
  { action: 'cycleDepth', label: 'Depth — cycle Soft/Deep', scope: 'Global' },
  { action: 'decodeJump', label: 'Jump to Decode', scope: 'Global' },
  { action: 'exportGratitude', label: 'Export Gratitude', scope: 'Footer' },
  { action: 'exportBoundary', label: 'Export Boundary', scope: 'Footer' },
  { action: 'clearLedgers', label: 'Clear ledgers', scope: 'Footer' },
  { action: 'sendToWeave', label: 'Echo Sketch → Weave', scope: 'Echo Sketch' },
  { action: 'autoSendSketch', label: 'Auto-send toggle', scope: 'Echo Sketch' },
  { action: 'sealMotherline', label: 'Seal — Motherline', scope: 'Motherline' },
];

export default function HotkeysPanel() {
  const open = useHotkeysOpen();

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setHotkeysOpen(false);
      }
    };
    document.addEventListener('keydown', onKey, { capture: true });
    return () => document.removeEventListener('keydown', onKey, { capture: true as any });
  }, [open]);

  if (!open) return null;

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="hk-title" className="hk-modal">
      <div className="hk-card">
        <div className="hk-head">
          <h2 id="hk-title">Hotkeys</h2>
          <button type="button" className="hk-close" onClick={() => setHotkeysOpen(false)} aria-label="Close hotkeys panel">
            ×
          </button>
        </div>

        <p className="hk-desc">Platform-aware chords with input safety and calm SR announcements.</p>

        <div className="hk-grid" role="table" aria-label="Hotkeys reference">
          <div role="row" className="hk-row hk-row-head">
            <div role="columnheader">Action</div>
            <div role="columnheader">Shortcut</div>
            <div role="columnheader">Scope</div>
          </div>
          {ROWS.map((row) => {
            const attrs = chordAttr(row.action) as Record<string, string>;
            const shortcut = chordTitle(row.action) || attrs['data-chord'] || '';
            const aria = attrs['aria-keyshortcuts'];
            return (
              <div role="row" className="hk-row" key={row.action}>
                <div role="cell">{row.label}</div>
                <div role="cell">
                  <kbd className="hk-kbd" {...attrs}>
                    {shortcut}
                  </kbd>
                  {aria ? <span className="sr-only">{aria}</span> : null}
                </div>
                <div role="cell" className="hk-scope">
                  {row.scope}
                </div>
              </div>
            );
          })}
        </div>

        <div className="hk-foot">
          <button type="button" className="hk-secondary" onClick={toggleHotkeysOpen} {...chordAttr('openHotkeys')}>
            Close (press shortcut again)
          </button>
        </div>
      </div>
    </div>
  );
}
