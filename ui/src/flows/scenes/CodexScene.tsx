import * as React from 'react';
import { CodexPortal } from '@/flows/codex/CodexPortal';

export function CodexScene() {
  const [draft, setDraft] = React.useState('');

  const handleSeal = () => {
    const text = draft.trim();
    if (!text) return;
    const target =
      typeof document !== 'undefined'
        ? document
        : typeof window !== 'undefined'
        ? window
        : null;
    target?.dispatchEvent(
      new CustomEvent('codex:seal', {
        detail: {
          text,
          at: Date.now(),
        },
      })
    );
    setDraft('');
  };

  return (
    <section aria-labelledby="codex-scene-title">
      <header className="scene-head">
        <h3 id="codex-scene-title">Codex</h3>
        <p className="scene-sub">Invitation deck — one honest line, then seal.</p>
      </header>
      <CodexPortal value={draft} onChange={setDraft} onSeal={handleSeal} />
    </section>
  );
}
