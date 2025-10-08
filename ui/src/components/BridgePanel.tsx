import React, { useMemo, useState } from 'react';
import { useBridge } from '@/hooks/useBridge';
import { Button, Heading, Select, Text } from '@/ui/catalyst';
import type { BridgeKindAlias } from '@/types/patterns';

const OPTIONS: { value: BridgeKindAlias; label: string }[] = [
  { value: 'attachment_test', label: 'Attachment Testing' },
  { value: 'sibling_trust', label: 'Sibling Trust' },
  { value: 'parent_planted', label: 'Parent‑Planted Narrative' },
  { value: 'over_analysis', label: 'Over‑Analysis' },
];

export default function BridgePanel() {
  const [kind, setKind] = useState<BridgeKindAlias>('attachment_test');
  const [intensity, setIntensity] = useState(0.6);
  const { data, loading, error, refresh } = useBridge(kind, intensity);

  const fields = useMemo(
    () =>
      data
        ? ([
            ['hint', data.hint],
            ['breath', data.breath],
            ['doorway', data.doorway],
            ['anchor', data.anchor],
          ].filter(([_, v]) => Boolean(v)) as [string, string][])
        : [],
    [data]
  );

  async function copy(text: string | undefined) {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
    } catch (_) {}
  }

  return (
    <div className="grid gap-5 ">
      <div className="flex flex-wrap items-center gap-4">
        <Select value={kind} onChange={(event) => setKind(event.target.value as BridgeKindAlias)} aria-label="Bridge pattern kind" className="w-56">
          {OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
        <label className="flex items-center gap-3 text-sm font-medium text-zinc-600 dark:text-zinc-300">
          intensity
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={intensity}
            onChange={(e) => setIntensity(Number(e.target.value))}
            className="h-2 w-40 rounded-full accent-sky-500"
          />
          <span className="w-12 text-right tabular-nums text-zinc-500 dark:text-zinc-400">{intensity.toFixed(2)}</span>
        </label>
        <Button onClick={() => refresh()} disabled={loading} aria-live="polite">
          {loading ? 'Loading…' : 'Suggest'}
        </Button>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-500/60 bg-rose-100/70 px-4 py-3 text-sm text-rose-900 dark:border-rose-900/50 dark:bg-rose-900/40 dark:text-rose-100">
          Error: {error.message}
        </div>
      )}

      {data && (
        <div className="grid gap-3">
          {fields.map(([key, value]) => (
            <div key={key} className="grid grid-cols-[96px_1fr_auto] items-center gap-3 text-sm text-zinc-700 dark:text-zinc-200">
              <span className="uppercase tracking-wide text-zinc-400 dark:text-zinc-500">{key}</span>
              <span className="whitespace-pre-wrap leading-relaxed">{value}</span>
              <Button plain type="button" onClick={() => copy(value)} className="text-xs font-medium">
                Copy
              </Button>
            </div>
          ))}
        </div>
      )}

      {!data && !loading && !error && (
        <Text className="text-sm">Pick a pattern and adjust intensity to get a bridge suggestion. Suggestions surface bridges, not diagnoses.</Text>
      )}

      <Text className="text-xs text-zinc-400 dark:text-zinc-600">
        maps, not diagnoses · ask for safety, don’t test for it · love stays, pact ends · author the present · clarity lands, then rest
      </Text>
    </div>
  );
}
