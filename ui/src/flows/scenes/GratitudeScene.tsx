import React, { useCallback, useRef, useState } from 'react';
import { Card, Field, Button } from '@gratiaos/ui';
import { useSceneLifecycle } from '@/flows/pads/hooks/useSceneLifecycle';
import { createGratitudeToken } from '@/flows/value/gratitudeTokens';
import { triggerEmber } from '@/flows/feedback/ember';
import { useProfile } from '@/state/profile';
import { mood$ } from '@gratiaos/presence-kernel';
import { useSignalSelector } from '@/lib/useSignal';

export function GratitudeScene() {
  useSceneLifecycle('gratitude');
  const { me } = useProfile();
  const currentMood = useSignalSelector(mood$, (value) => value);
  const [line, setLine] = useState('');
  const [isSealing, setIsSealing] = useState(false);
  const fieldRef = useRef<HTMLTextAreaElement | null>(null);

  const clear = useCallback(() => {
    setLine('');
    requestAnimationFrame(() => fieldRef.current?.focus());
  }, []);

  const seal = useCallback(() => {
    const message = line.trim();
    if (!message || isSealing) return;
    setIsSealing(true);
    try {
      triggerEmber?.();
      createGratitudeToken({
        from: me ?? 'local-user',
        message,
        scene: 'memory/gratitude',
        resonance: currentMood,
      });
      clear();
    } finally {
      setIsSealing(false);
    }
  }, [clear, currentMood, isSealing, line, me]);

  const onKeyDown: React.KeyboardEventHandler<HTMLTextAreaElement> = (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      clear();
      return;
    }
    const isSubmitCombo = (event.metaKey || event.ctrlKey) && event.key === 'Enter';
    if (isSubmitCombo || (event.key === 'Enter' && !event.shiftKey)) {
      event.preventDefault();
      seal();
    }
  };

  return (
    <Card className="space-y-3" aria-label="Gratitude ritual">
      <header className="space-y-1">
        <p className="text-sm font-semibold text-subtle uppercase tracking-widest">Memory Pad</p>
        <h2 className="text-xl font-semibold text-text">Gratitude</h2>
        <p className="text-sm text-subtle">Seal one line of thanks. Presence carries the resonance.</p>
      </header>

      <Field label="Gratitude" description="Thank you for…">
        {(ariaProps) => (
          <textarea
            {...ariaProps}
            ref={fieldRef}
            rows={3}
            placeholder='“Thank you for…”'
            value={line}
            onChange={(event) => setLine(event.target.value)}
            onKeyDown={onKeyDown}
            autoFocus
          />
        )}
      </Field>

      <div className="pad-actions">
        <Button tone="accent" onClick={seal} disabled={!line.trim() || isSealing}>
          {isSealing ? 'Sealing…' : 'Seal gratitude'}
        </Button>
        <Button variant="subtle" onClick={clear} disabled={!line}>
          Clear
        </Button>
      </div>
    </Card>
  );
}
