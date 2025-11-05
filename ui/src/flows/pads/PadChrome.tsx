import React from 'react';
import { usePadMood } from '@gratiaos/pad-core';
import type { PadDescriptor } from './pad-types';
import { clearPadRoute } from './hooks/usePadRoute';

interface PadChromeProps {
  pad: PadDescriptor;
  children: React.ReactNode;
}

const PadChrome: React.FC<PadChromeProps> = ({ pad, children }) => {
  const [mood] = usePadMood('soft');
  // (optional) keyboard hint for opening pad; currently unused — expose as data attr when present
  const keyboardHint = pad.meta?.keyboard?.open;
  const titleId = `pad-title-${pad.id}`;

  return (
    <section
      className="pad-surface min-h-dvh px-4 py-8"
      data-ui="pad-chrome"
      data-field="presence"
      data-pad-id={pad.id}
      data-pad-mood={mood}
      {...(keyboardHint ? { 'data-hotkey-open': keyboardHint } : {})}
      aria-labelledby={titleId}
      role="region">
      <div className="mx-auto max-w-5xl">
        <header className="mb-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span aria-hidden="true" className="text-xl">
              {pad.icon ?? '🌱'}
            </span>
            <div>
              <h1 id={titleId} className="text-lg font-semibold">
                {pad.title}
              </h1>
              {pad.whisper ? <p className="text-sm text-subtle">{pad.whisper}</p> : null}
            </div>
          </div>
          <button
            type="button"
            className="rounded-md px-3 py-1 text-sm text-subtle hover:text-text focus:outline-none focus:ring-2 focus:ring-offset-2"
            onClick={() => clearPadRoute(pad.id)}
            aria-label={`Close ${pad.title}`}
            title="Close (Esc)">
            Close
          </button>
        </header>

        <div className="pad-content">{children}</div>
      </div>
    </section>
  );
};

export default PadChrome;
