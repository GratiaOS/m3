import React, { useEffect } from 'react';
import { Button, showToast } from '@gratiaos/ui';
import { useAnnouncePreference } from '../flows/presence/a11y/announcePreference';
import {
  gratitudeLedger$,
  boundaryLedger$,
  exportLedgerBlob,
  clearGratitudeLedger,
  clearBoundaryLedger,
  exportLedgerRedactedBlob,
} from '@/flows/value/gratitudeTokens';
import { useSignalSelector, useSignalManySelector, shallowEqual } from '@/lib/useSignal';
import { authority$, mood$ } from '@gratiaos/presence-kernel';
import { consent$, depth$ } from '@/flows/relational/relationalAlignment';
import { matchesChord } from '@/lib/hotkeys';

const selectFooter = (vals: readonly unknown[]) => ({
  authority: vals[0] as string,
  mood: vals[1] as string,
  consent: vals[2] as boolean,
  depth: vals[3] as string,
});

const formatMood = (m: string) => {
  switch (m) {
    case 'soft':
      return 'Soft';
    case 'focused':
      return 'Focused';
    case 'celebratory':
      return 'Celebratory';
    default:
      return m ? m.charAt(0).toUpperCase() + m.slice(1) : '—';
  }
};

export function SystemFooter() {
  const [enabled, setEnabled] = useAnnouncePreference();
  const { authority, mood, consent, depth } = useSignalManySelector([authority$, mood$, consent$, depth$], selectFooter, shallowEqual);
  const canExportGratitude = useSignalSelector(gratitudeLedger$, (entries) => entries.length > 0);
  const canExportBoundary = useSignalSelector(boundaryLedger$, (entries) => entries.length > 0);

  const download = (kind: 'gratitude' | 'boundary') => {
    const blob = exportLedgerBlob(kind);
    const ts = new Date().toISOString().replace(/[:]/g, '-').replace('T', '-').split('.')[0];
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `garden-${kind}-ledger-${ts}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    showToast({ icon: '💾', title: `Exported ${kind}`, desc: `${kind} ledger saved.`, variant: 'neutral' });
  };

  const clearAll = () => {
    if (!window.confirm('Clear all local ledgers? This cannot be undone.')) return;
    clearGratitudeLedger();
    clearBoundaryLedger();
    showToast({ icon: '🧹', title: 'Ledgers cleared', desc: 'Local gratitude & boundary memories removed.', variant: 'warning' });
  };
  useEffect(() => {
    const isEditable = (el: Element | null) => {
      if (!el) return false;
      const tag = el.tagName;
      return tag === 'INPUT' || tag === 'TEXTAREA' || (el as HTMLElement).isContentEditable;
    };

    const handleKey = (event: KeyboardEvent) => {
      if (matchesChord(event, 'decodeJump')) {
        const targetHash = '#pad=memory&scene=decode';
        if (window.location.hash !== targetHash) {
          window.location.hash = targetHash;
        } else {
          const hashEvent =
            typeof HashChangeEvent === 'function' ? new HashChangeEvent('hashchange') : new Event('hashchange');
          window.dispatchEvent(hashEvent);
        }
        requestAnimationFrame(() => {
          const el = document.getElementById('decode-incoming') as HTMLTextAreaElement | null;
          if (el) {
            el.focus();
            el.select?.();
          }
        });
        return;
      }
      if (!event.altKey) return;
      if (isEditable(event.target as Element | null)) return;
      const key = event.key.toLowerCase();
      if (key === 'e') {
        event.preventDefault();
        if (canExportGratitude) download('gratitude');
      } else if (key === 'b') {
        event.preventDefault();
        if (canExportBoundary) download('boundary');
      } else if (event.key === 'Backspace') {
        event.preventDefault();
        if (canExportGratitude || canExportBoundary) clearAll();
      }
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [canExportBoundary, canExportGratitude, clearAll, download]);

  return (
    <footer className="system-footer">
      <small role="status">
        🌕 M3 · Garden Core Interface — {authority} · {formatMood(mood)} · {consent ? 'Memory' : 'No memory'} ·{' '}
        {depth === 'deep' ? 'Deep' : 'Soft'}
      </small>
      <div className="pad-footer-actions export-controls">
        <Button variant="ghost" size="sm" onClick={() => setEnabled(!enabled)} aria-pressed={enabled} data-fastener="A">
          a11y announce: {enabled ? 'on' : 'off'}
        </Button>
        <Button variant="ghost" size="sm" onClick={() => download('gratitude')} disabled={!canExportGratitude}>
          Export gratitude
        </Button>
        <Button variant="ghost" size="sm" onClick={() => download('boundary')} disabled={!canExportBoundary}>
          Export boundaries
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => downloadRedacted('gratitude')}
          disabled={!canExportGratitude}>
          Export gratitude (redacted)
        </Button>
        <Button
          variant="ghost"
          size="sm"
          tone="danger"
          onClick={clearAll}
          disabled={!canExportGratitude && !canExportBoundary}>
          Clear ledgers
        </Button>
      </div>
    </footer>
  );
}
  const downloadRedacted = async (kind: 'gratitude' | 'boundary') => {
    const blob = await exportLedgerRedactedBlob(kind, 'hash');
    const ts = new Date().toISOString().replace(/[:]/g, '-').replace('T', '-').split('.')[0];
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `garden-${kind}-ledger-redacted-${ts}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    showToast({ icon: '🔒', title: `Exported ${kind} (redacted)`, desc: 'Content hashed for sharing.', variant: 'neutral' });
  };
