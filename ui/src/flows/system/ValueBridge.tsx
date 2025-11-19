import React, { useEffect, useState } from 'react';
import { runValueSealRitual, mood$ } from '@gratiaos/presence-kernel';
import { useProfile } from '@/state/profile';
import { Field } from '../presence/placeholders/Field';
import { triggerEmber } from '../feedback/ember';
import { createGratitudeToken } from '../value/gratitudeTokens';
import '../../styles/system.css';

const DEFAULT_RECEIVED = 'vision';

export function ValueBridge() {
  const { me } = useProfile();
  const [received] = useState(DEFAULT_RECEIVED);
  const [felt, setFelt] = useState('');
  const [given, setGiven] = useState('');

  useEffect(() => {
    if (received === 'vision' && !given) {
      setGiven('energy');
    }
  }, [received, given]);

  const seal = () => {
    runValueSealRitual();
    triggerEmber();
    const message = felt.trim() || given.trim() || received;
    createGratitudeToken({
      from: me ?? 'local-user',
      message,
      scene: 'ValueBridge',
      resonance: mood$.value,
    });
    setFelt('');
    setGiven('');
  };

  return (
    <div className="card value-bridge" aria-labelledby="value-bridge-title">
      <h3 id="value-bridge-title">Value Bridge</h3>
      <div className="row">
        <label htmlFor="value-received">Received</label>
        <div className="pill" id="value-received" aria-live="polite">
          {received}
        </div>
      </div>
      <div className="value-field-group">
        <Field
          id="value-felt"
          label="Felt as"
          hint="warm horizon, blue hush…"
          value={felt}
          onChange={(event) => setFelt(event.target.value)}
          autoComplete="off"
          tint="ask"
        />
      </div>
      <div className="value-field-group">
        <Field
          id="value-given"
          label="Give back"
          hint="energy, attention, warmth…"
          value={given}
          onChange={(event) => setGiven(event.target.value)}
          autoComplete="off"
          tint="true"
        />
      </div>
      <button type="button" className="seal" onClick={seal} aria-label="Seal value cycle">
        Seal
      </button>
    </div>
  );
}

export default ValueBridge;
