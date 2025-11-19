import React, { useEffect, useState } from 'react';
import { Button, Card, Pill } from '@gratiaos/ui';
import { Input, Text, Textarea } from '@/ui/catalyst';
import { useSceneTransition } from '@/flows/pads/hooks/useSceneTransition';
import { postNumberSignal, type NumberSignalResponse, type PatternCategory, type SignalStrength } from '@/api';
import { setPresenceMood } from '@/presence/presence-kernel';

type NumbersPadProps = {
  sceneId?: string | null;
};

const CATEGORY_LABEL: Record<PatternCategory, string> = {
  mirror: 'Mirror',
  repeat: 'Repeat',
  sequence: 'Sequence',
  none: 'No pattern',
};

const STRENGTH_LABEL: Record<SignalStrength, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
};

const CLASS_TONE: Record<NumberSignalResponse['classification'], 'positive' | 'warning' | undefined> = {
  signal: 'positive',
  anxiety_loop: 'warning',
  neutral: undefined,
};

const CLASS_VARIANT: Record<NumberSignalResponse['classification'], 'solid' | 'subtle'> = {
  signal: 'solid',
  anxiety_loop: 'solid',
  neutral: 'subtle',
};

export function NumbersPad({ sceneId }: NumbersPadProps) {
  const { scene, change } = useSceneTransition('signal', sceneId);
  const [label, setLabel] = useState('11:11');
  const [effect, setEffect] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<NumberSignalResponse | null>(null);

  useEffect(() => {
    if (scene !== 'signal') {
      change('signal');
    }
    setPresenceMood('soft');
  }, [scene, change]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmedLabel = label.trim();
    if (!trimmedLabel) {
      setError('Add a number, timestamp, or mirrored moment (e.g., 09:09).');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const payloadEffect = effect.trim();
      const data = await postNumberSignal({ label: trimmedLabel, effect: payloadEffect ? payloadEffect : undefined });
      setResult(data);
    } catch (err) {
      console.error('[NumbersPad] read signal failed', err);
      setError(err instanceof Error ? err.message : 'Failed to read number signal.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="flex flex-col gap-4" data-pad="numbers">
      <Card as="form" className="space-y-4" onSubmit={handleSubmit}>
        <header className="space-y-1">
          <p className="text-sm font-semibold uppercase tracking-widest text-subtle">Numbers</p>
          <h2 className="text-xl font-semibold text-text">Field signal reader</h2>
          <Text className="text-sm text-subtle">Treat timestamps and repeating digits as field markers. Type what you saw and how it felt.</Text>
        </header>
        <label className="block space-y-1 text-sm font-medium text-text">
          Number or timestamp
          <Input
            value={label}
            onChange={(event) => setLabel(event.currentTarget.value)}
            placeholder="11:11 or 2025-11-19"
            aria-label="Number or timestamp label"
            required
          />
        </label>
        <label className="block space-y-1 text-sm font-medium text-text">
          Felt effect (optional)
          <Textarea
            value={effect}
            onChange={(event) => setEffect(event.currentTarget.value)}
            placeholder="e.g., “body softened”, “pressure in chest”, “felt urgent”."
            rows={3}
            aria-label="Felt effect"
          />
        </label>
        <div className="flex flex-wrap items-center gap-3">
          <Button tone="accent" type="submit" disabled={loading} aria-busy={loading}>
            {loading ? 'Reading…' : 'Read signal'}
          </Button>
          <Button variant="ghost" asChild>
            <a href="https://github.com/GratiaOS/m3/blob/main/docs/modules/numbers.md" target="_blank" rel="noreferrer">
              Numbers module
            </a>
          </Button>
        </div>
        {error && (
          <p role="alert" className="text-sm text-rose-500">
            {error}
          </p>
        )}
        {result && (
          <div className="space-y-2" aria-live="polite">
            <div className="flex flex-wrap items-center gap-2">
              <Pill tone={CLASS_TONE[result.classification]} variant={CLASS_VARIANT[result.classification]} density="snug">
                {result.classification.replace('_', ' ')}
              </Pill>
              <NumberSignalBadge category={result.category} strength={result.strength} />
            </div>
            <Text className="text-sm text-subtle">{result.reasoning}</Text>
          </div>
        )}
      </Card>
    </section>
  );
}

function NumberSignalBadge({ category, strength }: { category: PatternCategory; strength: SignalStrength }) {
  if (category === 'none') {
    return (
      <span className="inline-flex items-center rounded-full border border-border/60 px-2 py-0.5 text-xs uppercase tracking-wide text-subtle">
        No pattern
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-surface/80 px-2 py-0.5 text-xs font-medium text-text">
      <span>{CATEGORY_LABEL[category]}</span>
      <span aria-hidden="true">·</span>
      <span>{STRENGTH_LABEL[strength]}</span>
    </span>
  );
}
