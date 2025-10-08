import React from 'react';
import { createThanks } from '@/api';

export default function ThanksPanel(props: { me?: string; attachNoteId?: number }) {
  const [subject, setSubject] = React.useState('');
  const [details, setDetails] = React.useState('');
  const [busy, setBusy] = React.useState(false);

  const submit = async () => {
    const s = subject.trim();
    if (!s) return;
    setBusy(true);
    try {
      await createThanks({
        subject: s,
        details: details.trim() || undefined,
        who: props.me,
        note_id: props.attachNoteId,
      });
      setSubject('');
      setDetails('');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ border: '1px solid #ddd', borderRadius: 8, padding: 12, display: 'grid', gap: 12 }}>
      <h3 style={{ margin: 0 }}>Give thanks</h3>
      <div style={{ display: 'grid', gap: 8 }}>
        <input placeholder="for the stonework, the window light, the unseen hands…" value={subject} onChange={(e) => setSubject(e.target.value)} />
        <textarea placeholder="optional: a line of context" rows={2} value={details} onChange={(e) => setDetails(e.target.value)} />
      </div>
      <div>
        <button onClick={submit} disabled={busy || !subject.trim()} title="Record a gratitude entry">
          Thank
        </button>
      </div>
    </div>
  );
}
