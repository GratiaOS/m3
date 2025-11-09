import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button, Card, Field } from '@gratiaos/ui';
import { runValueSealRitual, mood$ } from '@gratiaos/presence-kernel';
import { triggerEmber } from '@/flows/feedback/ember';
import { createGratitudeToken, createBoundaryToken, type BodySignal } from '@/flows/value/gratitudeTokens';
import { useProfile } from '@/state/profile';
import { useSceneLifecycle } from '@/flows/pads/hooks/useSceneLifecycle';

interface DecodeSceneProps {
  onBack?: () => void;
}

type Classification = 'constant' | 'variable';

export function DecodeScene({ onBack }: DecodeSceneProps) {
  useSceneLifecycle('decode');

  const { me } = useProfile();
  const actor = me ?? 'local-user';

  const [incoming, setIncoming] = useState('');
  const [body, setBody] = useState<BodySignal>('');
  const [classification, setClassification] = useState<Classification>('variable');
  const [rewrite, setRewrite] = useState('');
  const [microAct, setMicroAct] = useState('');
  const [isSealing, setIsSealing] = useState(false);

  const incomingRef = useRef<HTMLTextAreaElement | null>(null);
  const rewriteRef = useRef<HTMLInputElement | null>(null);

  const canSeal = useMemo(() => incoming.trim().length > 0, [incoming]);

  useEffect(() => {
    incomingRef.current?.focus();
  }, []);

  const clearForm = useCallback(() => {
    setIncoming('');
    setBody('');
    setClassification('variable');
    setRewrite('');
    setMicroAct('');
    requestAnimationFrame(() => incomingRef.current?.focus());
  }, []);

  const handleSeal = useCallback(() => {
    if (!canSeal || isSealing) return;
    setIsSealing(true);
    const trimmedIncoming = incoming.trim();
    const trimmedRewrite = rewrite.trim();
    const trimmedAct = microAct.trim();

    runValueSealRitual();
    try {
      triggerEmber?.();
    } catch {
      /* noop */
    }

    createGratitudeToken({
      from: actor,
      message: trimmedRewrite
        ? `Saw: ${trimmedIncoming} → chose: ${trimmedRewrite}`
        : `Saw: ${trimmedIncoming}`,
      scene: 'Decode',
      resonance: mood$.value,
    });

    createBoundaryToken({
      from: actor,
      message: trimmedIncoming,
      rewrite: trimmedRewrite,
      classification,
      microAct: trimmedAct,
      body,
      scene: 'Decode',
    });

    try {
      window.dispatchEvent(
        new CustomEvent('boundary:formed', {
          detail: { incoming: trimmedIncoming, rewrite: trimmedRewrite, classification, microAct: trimmedAct, body },
        })
      );
    } catch {
      /* noop */
    }

    clearForm();
    setTimeout(() => setIsSealing(false), 520);
  }, [actor, body, classification, clearForm, canSeal, incoming, microAct, rewrite, isSealing, onBack]);

  const onSceneKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      clearForm();
    }
  };

  const onRewriteKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSeal();
    }
  };

  const renderToggle = (label: string, active: boolean, onClick: () => void) => (
    <Button
      type="button"
      density="snug"
      variant={active ? 'solid' : 'outline'}
      tone={active ? 'accent' : 'subtle'}
      onClick={onClick}>
      {label}
    </Button>
  );

  return (
    <Card className="space-y-4" onKeyDown={onSceneKeyDown}>
      <header className="space-y-2">
        <p className="text-sm font-semibold text-subtle uppercase tracking-widest">Memory Pad</p>
        <h2 className="text-xl font-semibold text-text">Decode</h2>
        <p className="text-sm text-subtle">Intercept → body check → classify → rewrite → act.</p>
      </header>

      <Field label="Incoming line" description="Copy it exactly before you respond.">
        {(aria) => (
          <textarea
            {...aria}
            id="decode-incoming"
            rows={3}
            className="input-base w-full"
            ref={incomingRef}
            value={incoming}
            onChange={(event) => setIncoming(event.target.value)}
            placeholder="Copy the line exactly…"
            autoFocus
          />
        )}
      </Field>

      <div className="space-y-2">
        <p className="text-sm font-medium text-subtle">Body signal</p>
        <div className="flex flex-wrap gap-2">
          {renderToggle('soft', body === 'soft', () => setBody('soft'))}
          {renderToggle('tight', body === 'tight', () => setBody('tight'))}
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium text-subtle">Classification</p>
        <div className="flex flex-wrap gap-2">
          {renderToggle('constant', classification === 'constant', () => setClassification('constant'))}
          {renderToggle('variable', classification === 'variable', () => setClassification('variable'))}
        </div>
      </div>

      <Field label="Rewrite (your line)" description="Use “I choose…”, “I don't know yet…”.">
        {(aria) => (
          <input
            {...aria}
            type="text"
            className="input-base w-full"
            ref={rewriteRef}
            value={rewrite}
            onChange={(event) => setRewrite(event.target.value)}
            placeholder={'"I choose…", "I don\'t know yet…"'}
            onKeyDown={onRewriteKeyDown}
          />
        )}
      </Field>

      <Field label="Micro-act (30s real move)" description="Water, stretch, send, delete, step outside…">
        {(aria) => (
          <input
            {...aria}
            type="text"
            className="input-base w-full"
            value={microAct}
            onChange={(event) => setMicroAct(event.target.value)}
            placeholder="water / stretch / message / delete / stand…"
          />
        )}
      </Field>

      <div className="flex flex-wrap items-center justify-end gap-2">
        {onBack && (
          <Button variant="outline" onClick={onBack} type="button">
            ← back
          </Button>
        )}
        <Button tone="accent" onClick={handleSeal} disabled={!canSeal || isSealing}>
          {isSealing ? 'Sealing…' : 'Seal Decode'}
        </Button>
        <Button variant="ghost" onClick={clearForm} type="button">
          Clear
        </Button>
      </div>
    </Card>
  );
}
