import React, { useEffect, useMemo, useState } from 'react';
import { Button, Textarea } from '@/ui/catalyst';
import Modal from '@/components/Modal';
import { usePurpose } from '@/hooks/usePurpose';
import type { PurposeSignal } from '@/types/purpose';
import { toast } from '@/components/Toaster';

const STATUS_COLOR: Record<PurposeSignal, string> = {
  alive: '#22c55e',
  dim: '#fbbf24',
  lost: '#d4d4d8',
};

type TimelinePayload = {
  title: string;
  subtitle?: string;
  meta?: Record<string, unknown>;
  icon?: React.ReactNode;
};

type PurposeChipProps = {
  onAddToTimeline?: (entry: TimelinePayload) => void;
};

const STATUS_LABEL: Record<PurposeSignal, string> = {
  alive: 'alive',
  dim: 'dim',
  lost: 'lost',
};

export default function PurposeChip({ onAddToTimeline }: PurposeChipProps) {
  const { data, loading, set, ping, align } = usePurpose();
  const [open, setOpen] = useState(false);
  const [draftStatement, setDraftStatement] = useState('');
  const [draftPrinciples, setDraftPrinciples] = useState('');

  useEffect(() => {
    if (!open || !data) return;
    setDraftStatement(data.statement);
    setDraftPrinciples((data.principles ?? []).join('\n'));
  }, [open, data]);

  const title = useMemo(() => {
    const stmt = data?.statement?.trim();
    if (!stmt) return 'Set purpose';
    return stmt.length > 48 ? `${stmt.slice(0, 45)}…` : stmt;
  }, [data?.statement]);

  const currentSignal: PurposeSignal = data?.signal ?? 'dim';

  if (loading || !data) return null;

  function handleSave() {
    const principles = draftPrinciples
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .slice(0, 5);
    set({
      statement: draftStatement.trim(),
      principles,
    });
    setOpen(false);
    toast({
      level: 'success',
      title: 'Purpose saved',
      icon: '🎯',
      body: 'Statement and principles updated.',
    });
  }

  function handlePing(signal: PurposeSignal) {
    ping(signal);
    toast({
      level: 'info',
      title: `Purpose marked ${STATUS_LABEL[signal]}`,
      icon: '🟢',
      body: 'Take one breath with it before moving on.',
    });
  }

  function handleAlign() {
    const { next } = align();
    const snapshot = {
      statement: data.statement,
      principlesHash: data.principles.join('|'),
      last_check_ts: data.last_check_ts,
      signal: data.signal,
    };
    onAddToTimeline?.({
      title: '🎯 Purpose Align',
      subtitle: next,
      meta: { source: 'purpose', purpose_snapshot: snapshot },
      icon: '🎯',
    });
    toast({
      level: 'info',
      title: 'One true next',
      icon: '🎯',
      body: next,
    });
  }

  return (
    <>
      <Button plain type="button" onClick={() => setOpen(true)} title={data.statement ? data.statement : 'Set purpose'}>
        <span aria-hidden>🎯</span>
        <span style={{ marginLeft: 6 }}>{title}</span>
        <span
          aria-label={`Purpose signal ${STATUS_LABEL[currentSignal]}`}
          title={`Purpose signal ${STATUS_LABEL[currentSignal]}`}
          style={{
            width: 10,
            height: 10,
            borderRadius: '50%',
            marginLeft: 8,
            backgroundColor: STATUS_COLOR[currentSignal],
            boxShadow: '0 0 0 1px rgba(0,0,0,0.08)',
          }}
        />
      </Button>

      <Modal open={open} onClose={() => setOpen(false)} title="Purpose">
        <div className="grid gap-4">
          <div className="grid gap-2">
            <label className="text-xs font-medium uppercase tracking-wide text-zinc-500">Statement</label>
            <Textarea
              value={draftStatement}
              onChange={(e) => setDraftStatement(e.target.value)}
              rows={3}
              placeholder="Serve X with Y so that Z"
              resizable={false}
            />
          </div>

          <div className="grid gap-2">
            <label className="text-xs font-medium uppercase tracking-wide text-zinc-500">Principles (one per line, up to 5)</label>
            <Textarea
              value={draftPrinciples}
              onChange={(e) => setDraftPrinciples(e.target.value)}
              rows={5}
              placeholder={'Name 3–5 non-negotiables.\nExample:\n• Lead with consent\n• Rest before panic'}
            />
          </div>

          <section className="flex flex-wrap items-center gap-2">
            <Button type="button" onClick={handleSave}>
              Save
            </Button>
            <Button plain type="button" onClick={() => handlePing('alive')}>
              mark alive
            </Button>
            <Button plain type="button" onClick={() => handlePing('dim')}>
              mark dim
            </Button>
            <Button plain type="button" onClick={() => handlePing('lost')}>
              mark lost
            </Button>
            <div className="grow" />
            <Button type="button" onClick={handleAlign}>
              Align → timeline
            </Button>
          </section>

          <p className="text-xs leading-relaxed text-zinc-500">
            Ritual: name it, speak it aloud, breathe once with it. Tap alive/dim/lost daily, and press Align when you need one true next.
          </p>
        </div>
      </Modal>
    </>
  );
}
