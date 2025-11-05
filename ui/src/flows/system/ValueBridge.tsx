import React, { useEffect, useState } from 'react';
import '../../styles/system.css';

const DEFAULT_RECEIVED = 'vision';

export function ValueBridge() {
  const [received] = useState(DEFAULT_RECEIVED);
  const [felt, setFelt] = useState('');
  const [given, setGiven] = useState('');

  useEffect(() => {
    if (received === 'vision' && !given) {
      setGiven('energy');
    }
  }, [received, given]);

  const seal = () => {
    // TODO: integrate with reciprocity stream
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
      <div className="row">
        <label htmlFor="value-felt">Felt as</label>
        <input
          id="value-felt"
          placeholder="warm horizon, blue hush…"
          value={felt}
          onChange={(event) => setFelt(event.target.value)}
          className="halo"
          data-halo
        />
      </div>
      <div className="row">
        <label htmlFor="value-given">Give back</label>
        <input
          id="value-given"
          placeholder="energy, attention, warmth…"
          value={given}
          onChange={(event) => setGiven(event.target.value)}
          className="halo"
          data-halo
        />
      </div>
      <button type="button" className="seal" onClick={seal} aria-label="Seal value cycle">
        Seal
      </button>
    </div>
  );
}

export default ValueBridge;
