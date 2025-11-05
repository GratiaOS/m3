import React from 'react';
import { useAnnouncePreference } from '../flows/presence/a11y/announcePreference';

export function SystemFooter() {
  const [enabled, setEnabled] = useAnnouncePreference();
  return (
    <footer className="system-footer">
      <small role="status">🌕 M3 · Garden Core Interface — synced to presence pulse</small>
      <button
        type="button"
        onClick={() => setEnabled(!enabled)}
        className="ml-4 px-2 py-1 text-xs rounded border border-subtle hover:bg-subtle focus:outline-none focus:ring-2"
        aria-pressed={enabled}
        aria-label={`Toggle accessibility announcements (${enabled ? 'on' : 'off'})`}
        data-fastener="A">
        a11y announce: {enabled ? 'on' : 'off'}
      </button>
    </footer>
  );
}
