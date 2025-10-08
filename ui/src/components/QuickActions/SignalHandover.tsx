import React, { useMemo, useState } from 'react';
import { ingest } from '@/api';

type Step = 1 | 2 | 3 | 4 | 5;

const FREQS = ['crown', 'void', 'play', 'dragon', 'life force', 'earth'] as const;
type Freq = (typeof FREQS)[number] | 'custom';

export default function SignalHandover({ onClose, defaultTags = [] }: { onClose: () => void; defaultTags?: string[] }) {
  const [step, setStep] = useState<Step>(1);

  // Step 1 – awareness
  const [ack, setAck] = useState(false);

  // Step 2 – frequency
  const [freq, setFreq] = useState<Freq>('dragon');
  const [freqCustom, setFreqCustom] = useState('');

  // Step 3 – raw data
  const [raw, setRaw] = useState('');

  // Step 4 – invite (confirm handover)
  const [invited, setInvited] = useState(false);

  // Step 5 – co-action
  const [coAction, setCoAction] = useState('cook with music');

  const resolvedFreq = useMemo(() => (freq === 'custom' ? freqCustom.trim() || 'signal' : freq), [freq, freqCustom]);

  async function log(text: string, tags: string[]) {
    await ingest({
      text,
      tags,
      profile: 'Raz',
      privacy: 'public',
      importance: 1,
    });
  }

  async function next() {
    // log each step minimally
    if (step === 1 && ack) {
      await log(`Handover/Awareness: Dragon named and acknowledged.`, ['handover_session', 'awareness', ...defaultTags]);
      setStep(2);
      return;
    }
    if (step === 2) {
      await log(`Handover/Frequency: ${resolvedFreq}`, ['handover_session', 'frequency', resolvedFreq, ...defaultTags]);
      setStep(3);
      return;
    }
    if (step === 3) {
      await log(`Handover/RawData:\n${raw}`, ['handover_session', 'raw', resolvedFreq, ...defaultTags]);
      setStep(4);
      return;
    }
    if (step === 4 && invited) {
      await log(`Handover/Invite: Signal handed over for interpretation.`, ['handover_session', 'invite', resolvedFreq, ...defaultTags]);
      setStep(5);
      return;
    }
    if (step === 5) {
      await log(`Handover/CoAction: ${coAction}`, ['handover_session', 'co-action', resolvedFreq, ...defaultTags]);
      onClose();
    }
  }

  function disabled(): boolean {
    if (step === 1) return !ack;
    if (step === 2) return freq === 'custom' && !freqCustom.trim();
    if (step === 3) return !raw.trim();
    if (step === 4) return !invited;
    return false;
  }

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      {step === 1 && (
        <section style={{ display: 'grid', gap: 8 }}>
          <h3 style={{ margin: 0 }}>1) Dragon Awareness</h3>
          <p style={{ margin: 0, opacity: 0.8 }}>Name the high-energy presence so everyone can see it.</p>
          <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input type="checkbox" checked={ack} onChange={(e) => setAck(e.target.checked)} />
            <span>“Dragon’s here. I’m naming it so we can handle it together.”</span>
          </label>
        </section>
      )}

      {step === 2 && (
        <section style={{ display: 'grid', gap: 8 }}>
          <h3 style={{ margin: 0 }}>2) Frequency Naming</h3>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {FREQS.map((f) => (
              <button
                key={f}
                onClick={() => setFreq(f)}
                style={{
                  padding: '6px 10px',
                  borderRadius: 999,
                  border: '1px solid #ddd',
                  background: freq === f ? '#111' : '#f6f6f6',
                  color: freq === f ? '#fff' : '#111',
                }}>
                {f}
              </button>
            ))}
            <button
              onClick={() => setFreq('custom')}
              style={{
                padding: '6px 10px',
                borderRadius: 999,
                border: '1px solid #ddd',
                background: freq === 'custom' ? '#111' : '#f6f6f6',
                color: freq === 'custom' ? '#fff' : '#111',
              }}>
              custom
            </button>
          </div>
          {freq === 'custom' && (
            <input autoFocus placeholder="name the frequency…" value={freqCustom} onChange={(e) => setFreqCustom(e.target.value)} />
          )}
        </section>
      )}

      {step === 3 && (
        <section style={{ display: 'grid', gap: 8 }}>
          <h3 style={{ margin: 0 }}>3) Raw Data Drop</h3>
          <p style={{ margin: 0, opacity: 0.8 }}>Only facts. No logic. No conclusions.</p>
          <textarea
            rows={6}
            placeholder="What you observed, word-for-word / timestamps / behaviors…"
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
          />
        </section>
      )}

      {step === 4 && (
        <section style={{ display: 'grid', gap: 8 }}>
          <h3 style={{ margin: 0 }}>4) Invite Feminine Interpretation</h3>
          <p style={{ margin: 0, opacity: 0.8 }}>Confirm you handed the signal over to be read & echoed in her words.</p>
          <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input type="checkbox" checked={invited} onChange={(e) => setInvited(e.target.checked)} />
            <span>Signal handed over — awaiting her interpretation.</span>
          </label>
        </section>
      )}

      {step === 5 && (
        <section style={{ display: 'grid', gap: 8 }}>
          <h3 style={{ margin: 0 }}>5) Co‑Action Reset</h3>
          <p style={{ margin: 0, opacity: 0.8 }}>Pick a light shared action to ground the system.</p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {['cook with music', 'clean kitchen (air cooler on)', 'short walk', 'sort a shelf', 'tea on terrace'].map((o) => (
              <button
                key={o}
                onClick={() => setCoAction(o)}
                style={{
                  padding: '6px 10px',
                  borderRadius: 999,
                  border: '1px solid #ddd',
                  background: coAction === o ? '#111' : '#f6f6f6',
                  color: coAction === o ? '#fff' : '#111',
                }}>
                {o}
              </button>
            ))}
          </div>
          <input placeholder="or custom…" value={coAction} onChange={(e) => setCoAction(e.target.value)} />
        </section>
      )}

      <footer style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
        <div style={{ opacity: 0.7 }}>
          Step {step} / 5 · freq: <b>{resolvedFreq}</b>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={onClose}>cancel</button>
          <button onClick={next} disabled={disabled()}>
            {step < 5 ? 'next' : 'finish'}
          </button>
        </div>
      </footer>
    </div>
  );
}
