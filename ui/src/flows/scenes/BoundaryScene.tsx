import React, { useCallback, useRef, useState } from 'react';
import { Button, Card, Field, showToast } from '@gratiaos/ui';
import { useSceneLifecycle } from '@/flows/pads/hooks/useSceneLifecycle';
import { addEmotion } from '@/api';
import { useProfile } from '@/state/profile';

type SceneProps = {
  onNext?: () => void;
  onBack?: () => void;
};

export function BoundaryScene({ onNext, onBack }: SceneProps) {
  useSceneLifecycle('boundary');
  const { me } = useProfile();
  const [boundary, setBoundary] = useState('');
  const [isQueuing, setIsQueuing] = useState(false);
  const fieldRef = useRef<HTMLTextAreaElement | null>(null);

  const clear = useCallback(() => {
    setBoundary('');
    requestAnimationFrame(() => fieldRef.current?.focus());
  }, []);

  const queueBoundary = useCallback(async () => {
    const statement = boundary.trim();
    if (!statement || isQueuing) return;
    setIsQueuing(true);
    try {
      await addEmotion({
        who: me ?? 'local-user',
        kind: 'boundary',
        intensity: 1.0,
        details: statement,
        sealed: false,
        privacy: 'private',
      });
      clear();
      showToast({
        title: 'Boundary set',
        desc: 'Your edge is marked in the field.',
        icon: '🛡️',
        variant: 'positive',
      });
    } catch (error) {
      console.error('Failed to queue boundary:', error);
      showToast({
        title: 'Queue failed',
        desc: 'Your boundary will retry.',
        icon: '🌬️',
        variant: 'warning',
      });
    } finally {
      setIsQueuing(false);
    }
  }, [boundary, clear, isQueuing, me]);

  return (
    <Card className="space-y-4">
      <header className="space-y-2">
        <p className="text-sm font-semibold text-subtle uppercase tracking-widest">Memory Pad</p>
        <h2 className="text-xl font-semibold text-text">Boundary Composer</h2>
        <p className="text-sm text-subtle">Draft the edges that keep your field sovereign. Publish when the wording feels true.</p>
      </header>
      <Field label="Boundary statement">
        {(ariaProps) => (
          <textarea
            {...ariaProps}
            ref={fieldRef}
            rows={4}
            className="input-base w-full halo"
            data-halo
            placeholder='"My rest window is 22:00–07:00. Please honor it."'
            value={boundary}
            onChange={(e) => setBoundary(e.target.value)}
            autoFocus
          />
        )}
      </Field>
      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button tone="accent" variant="solid" onClick={queueBoundary} disabled={!boundary.trim() || isQueuing}>
          {isQueuing ? 'Queueing…' : 'queue boundary'}
        </Button>
        {onBack && (
          <Button variant="outline" onClick={onBack}>
            back to gratitude
          </Button>
        )}
        {onNext && (
          <Button variant="outline" onClick={onNext}>
            decode →
          </Button>
        )}
      </div>
    </Card>
  );
}
