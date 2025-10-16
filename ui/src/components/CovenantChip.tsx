import React, { useState } from 'react';
import { Button } from '@/ui/catalyst';
import Modal from '@/components/Modal';

type Props = {
  onAddToTimeline?: (entry: { title: string; subtitle?: string }) => void;
};

type Status = 'pending' | 'yes' | 'testing';

const STATUS_OPTIONS: Status[] = ['pending', 'yes', 'testing'];

export default function CovenantChip({ onAddToTimeline }: Props) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<Status>('pending');

  const [care, setCare] = useState('Speak small truths kindly, on purpose.');
  const [consent, setConsent] = useState("Ask for connection; don't test for it.");
  const [repair, setRepair] = useState('When we miss, do one behavior within 24h (no penance).');
  const [promise, setPromise] = useState('');

  function addToTimeline() {
    const title = `Covenant — ${status}`;
    const parts = [
      `care: ${care.trim()}`,
      `consent: ${consent.trim()}`,
      `repair: ${repair.trim()}`,
    ];
    const subtitle = (promise.trim()
      ? [...parts, `promise: ${promise.trim()}`]
      : parts
    ).join(' · ');

    onAddToTimeline?.({ title, subtitle });
    setOpen(false);
  }

  return (
    <>
      <Button plain onClick={() => setOpen(true)} title="c">
        🤝 Covenant <span style={{ marginLeft: 6, opacity: 0.7 }}>{status}</span>
      </Button>

      <Modal open={open} onClose={() => setOpen(false)} title="Covenant">
        <div style={{ display: 'grid', gap: 10 }}>
          <label style={{ fontSize: 12 }}>Status</label>
          <select value={status} onChange={(e) => setStatus(e.target.value as Status)}>
            {STATUS_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>

          <label style={{ fontSize: 12 }}>Pillars (edit to taste)</label>
          <label style={{ fontSize: 12 }}>Care</label>
          <textarea rows={2} value={care} onChange={(e) => setCare(e.target.value)} />
          <label style={{ fontSize: 12 }}>Consent</label>
          <textarea rows={2} value={consent} onChange={(e) => setConsent(e.target.value)} />
          <label style={{ fontSize: 12 }}>Repair</label>
          <textarea rows={2} value={repair} onChange={(e) => setRepair(e.target.value)} />

          <label style={{ fontSize: 12 }}>Today's small promise (optional)</label>
          <input value={promise} onChange={(e) => setPromise(e.target.value)} placeholder="≤10 min action" />

          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <Button onClick={addToTimeline}>Add to timeline</Button>
            <span style={{ flex: 1 }} />
            <Button plain onClick={() => setOpen(false)}>
              Close
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
