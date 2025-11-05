import React, { useState } from 'react';
import { ValueBridge } from './ValueBridge';
import { EnergyCoach } from './EnergyCoach';
import '../../styles/system.css';

export function SystemPanel() {
  const [active, setActive] = useState<'value' | 'energy' | null>('value');

  return (
    <section className="system-panel" aria-label="System tools">
      <div className="system-toggle" role="group" aria-label="Select system tool">
        <button
          type="button"
          className={`system-pill ${active === 'value' ? 'active' : ''}`}
          aria-pressed={active === 'value'}
          onClick={() => setActive(active === 'value' ? null : 'value')}>
          <span aria-hidden>💸</span>
          <span className="sr-only">Value Bridge</span>
        </button>
        <button
          type="button"
          className={`system-pill ${active === 'energy' ? 'active' : ''}`}
          aria-pressed={active === 'energy'}
          onClick={() => setActive(active === 'energy' ? null : 'energy')}>
          <span aria-hidden>⚡</span>
          <span className="sr-only">Energy Coach</span>
        </button>
      </div>

      <div className="system-content">
        {active === 'value' ? <ValueBridge /> : null}
        {active === 'energy' ? <EnergyCoach chunks={[]} /> : null}
        {active === null ? <p className="system-hint">Select a tool to open it.</p> : null}
      </div>
    </section>
  );
}
